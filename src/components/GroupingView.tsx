import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Idea } from "../types/idea";
import type { ModuleConfig, ModuleResults, GroupResult } from "../types/module";
import "./GroupingView.css";

interface GroupingViewProps {
  ideas: Idea[];
  scrollId: string;
  maxGroups?: number;
  moduleIndex: number;
  modules: ModuleConfig[];
  userName: string;
  results?: ModuleResults;
}

interface Group {
  id: string;
  name: string;
  items: Idea[];
}

export default function GroupingView({
  ideas,
  scrollId,
  maxGroups = 5,
  moduleIndex,
  modules: _modules,
  userName,
  results,
}: GroupingViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [ungroupedItems, setUngroupedItems] = useState<Idea[]>(ideas);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [draggedItem, setDraggedItem] = useState<Idea | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  // Check if user already grouped
  useEffect(() => {
    if (results?.groups?.[userName]) {
      const userGroups = results.groups[userName];
      const loadedGroups: Group[] = userGroups.map((g) => ({
        id: g.id,
        name: g.name,
        items: g.itemIds
          .map((id) => ideas.find((i) => i.id === id))
          .filter(Boolean) as Idea[],
      }));
      const groupedIds = new Set(userGroups.flatMap((g) => g.itemIds));
      const ungrouped = ideas.filter((i) => !groupedIds.has(i.id));
      setGroups(loadedGroups);
      setUngroupedItems(ungrouped);
      setSubmitted(true);
    }
  }, [results, userName, ideas]);

  const handleCreateGroup = () => {
    if (groups.length >= maxGroups) return;

    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: `Group ${groups.length + 1}`,
      items: [],
    };
    setGroups([...groups, newGroup]);
    setEditingGroupId(newGroup.id);
    setNewGroupName(newGroup.name);
  };

  const handleRenameGroup = (groupId: string) => {
    if (!newGroupName.trim()) return;
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newGroupName.trim() } : g))
    );
    setEditingGroupId(null);
    setNewGroupName("");
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Return items to ungrouped
    setUngroupedItems((prev) => [...prev, ...group.items]);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleDragStart = (
    e: React.DragEvent,
    item: Idea,
    source: string
  ) => {
    setDraggedItem(item);
    setDragSource(source);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragSource(null);
  };

  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Remove from source
    if (dragSource === "ungrouped") {
      setUngroupedItems((prev) => prev.filter((i) => i.id !== draggedItem.id));
    } else if (dragSource) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === dragSource
            ? { ...g, items: g.items.filter((i) => i.id !== draggedItem.id) }
            : g
        )
      );
    }

    // Add to target group
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, items: [...g.items, draggedItem] } : g
      )
    );

    handleDragEnd();
  };

  const handleDropOnUngrouped = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || dragSource === "ungrouped") return;

    // Remove from source group
    if (dragSource) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === dragSource
            ? { ...g, items: g.items.filter((i) => i.id !== draggedItem.id) }
            : g
        )
      );
    }

    // Add to ungrouped
    setUngroupedItems((prev) => [...prev, draggedItem]);
    handleDragEnd();
  };

  const handleAddToGroup = (item: Idea, groupId: string) => {
    setUngroupedItems((prev) => prev.filter((i) => i.id !== item.id));
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, items: [...g.items, item] } : g
      )
    );
  };

  const handleRemoveFromGroup = (item: Idea, groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.filter((i) => i.id !== item.id) }
          : g
      )
    );
    setUngroupedItems((prev) => [...prev, item]);
  };

  const handleSubmit = async () => {
    if (submitting || submitted || groups.length === 0) return;

    setSubmitting(true);
    try {
      // Fetch fresh scroll data to avoid race conditions
      const { data: freshScroll } = await supabase
        .from("scrolls")
        .select("modules")
        .eq("id", scrollId)
        .single();

      if (!freshScroll) return;

      const updatedModules = [...freshScroll.modules];
      const currentResults = updatedModules[moduleIndex].results || {};
      const allGroups = currentResults.groups || {};

      // Convert groups to GroupResult format
      const userGroups: GroupResult[] = groups.map((g) => ({
        id: g.id,
        name: g.name,
        itemIds: g.items.map((item) => item.id),
      }));

      allGroups[userName] = userGroups;

      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        results: { ...currentResults, groups: allGroups },
      };

      await supabase
        .from("scrolls")
        .update({ modules: updatedModules })
        .eq("id", scrollId);

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting grouping:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const totalGroupedItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  if (submitted) {
    return (
      <div className="grouping-view">
        <div className="vote-submitted">
          <div className="submitted-icon">✓</div>
          <h3>Grouping Complete!</h3>
          <p>You organized {totalGroupedItems} items into {groups.length} groups.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grouping-view">
      <div className="grouping-header">
        <p className="grouping-instructions">
          Organize items into groups by dragging them or using the buttons.
        </p>
        <button
          className="create-group-btn"
          onClick={handleCreateGroup}
          disabled={groups.length >= maxGroups}
        >
          + Create Group ({groups.length}/{maxGroups})
        </button>
      </div>

      <div className="grouping-container">
        <div className="groups-panel">
          {groups.length === 0 ? (
            <div className="no-groups">
              <p>Create a group to start organizing items</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnGroup(e, group.id)}
              >
                <div className="group-header">
                  {editingGroupId === group.id ? (
                    <div className="group-name-edit">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameGroup(group.id);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        autoFocus
                      />
                      <button onClick={() => handleRenameGroup(group.id)}>✓</button>
                    </div>
                  ) : (
                    <>
                      <h4
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setNewGroupName(group.name);
                        }}
                      >
                        {group.name}
                      </h4>
                      <span className="group-count">{group.items.length}</span>
                      <button
                        className="delete-group-btn"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
                <div className="group-items">
                  {group.items.length === 0 ? (
                    <div className="group-placeholder">
                      Drop items here
                    </div>
                  ) : (
                    group.items.map((item) => (
                      <div
                        key={item.id}
                        className="grouped-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item, group.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <span>{item.text}</span>
                        <button
                          className="remove-item-btn"
                          onClick={() => handleRemoveFromGroup(item, group.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ungrouped-panel">
          <h3>Ungrouped Items ({ungroupedItems.length})</h3>
          <div
            className="ungrouped-list"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUngrouped}
          >
            {ungroupedItems.length === 0 ? (
              <div className="ungrouped-placeholder">
                All items have been grouped
              </div>
            ) : (
              ungroupedItems.map((item) => (
                <div
                  key={item.id}
                  className="ungrouped-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, "ungrouped")}
                  onDragEnd={handleDragEnd}
                >
                  <span>{item.text}</span>
                  {groups.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddToGroup(item, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Add to...
                      </option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grouping-submit">
        <button
          className="submit-grouping-btn"
          onClick={handleSubmit}
          disabled={submitting || groups.length === 0}
        >
          {submitting ? "Submitting..." : "Complete Grouping"}
        </button>
      </div>
    </div>
  );
}
