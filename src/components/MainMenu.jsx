export default function MainMenu({ currentPage, onChangePage, profile, onLogout }) {
  const isAdmin = profile?.role === 'admin'
  const isAssistant = profile?.role === 'assistant'


  const items = [
    { key: 'home', label: 'Accueil' },

    ...(isAdmin
      ? [
          { key: 'classes', label: 'Centres' },
          { key: 'assistants', label: 'Assistants' },
        ]
      : [{ key: 'assistant-profile', label: 'Mon profil' }]),

    { key: 'students', label: 'Étudiants' },
    { key: 'couples', label: 'Couples' },
    { key: 'seances', label: 'Séances' },
    { key: 'rattrapages', label: 'Rattrapages' },
    { key: 'paiements', label: 'Paiements' },
    {
      key: 'bilans',
      label: isAdmin ? 'Bilans' : 'Mon centre',
    },
  ]

  return (
    <div style={styles.wrapper}>
      <div style={styles.topInfo}>
        {isAdmin ? (
          <p style={styles.roleText}>Mode administrateur</p>
        ) : isAssistant ? (
          <p style={styles.roleText}>
            Assistant : {profile?.nom || '-'}{' '}
            {profile?.class_nom ? `• ${profile.class_nom}` : ''}
          </p>
        ) : null}
      </div>

      <div style={styles.grid}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChangePage(item.key)}
            style={{
              ...styles.button,
              ...(currentPage === item.key ? styles.activeButton : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        style={styles.logoutButton}
      >
        Déconnexion
      </button>
    </div>
  )
}

const styles = {
  wrapper: {
    padding: 16,
    paddingBottom: 8,
    background: '#f7f1fb',
  },
  topInfo: {
    maxWidth: 760,
    margin: '0 auto 12px',
    textAlign: 'center',
  },
  roleText: {
    margin: 0,
    color: '#6f5b84',
    fontWeight: 'bold',
    fontSize: 15,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    maxWidth: 760,
    margin: '0 auto',
  },
  button: {
    padding: 14,
    borderRadius: 16,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeButton: {
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    border: 'none',
  },
  logoutButton: {
    display: 'block',
    width: '100%',
    maxWidth: 760,
    margin: '12px auto 0',
    padding: 14,
    borderRadius: 16,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}
