import './ActiveUsers.css'

interface ActiveUsersProps {
  users: string[]
  currentUserName: string
}

export function ActiveUsers({ users, currentUserName }: ActiveUsersProps) {
  if (users.length === 0) {
    return null
  }

  return (
    <div className="active-users-container">
      <div className="active-users-header">
        <span className="active-users-count">{users.length}</span>
        <span className="active-users-label">
          {users.length === 1 ? 'viewer' : 'viewers'}
        </span>
      </div>
      <div className="active-users-list">
        {users.map((userName, index) => (
          <div
            key={`${userName}-${index}`}
            className={`active-user ${userName === currentUserName ? 'is-you' : ''}`}
          >
            <span className="active-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="active-user-name">
              {userName}
              {userName === currentUserName && ' (you)'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
