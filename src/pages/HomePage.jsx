export default function HomePage({ onNavigate, profile, onLogout }) {
  const isAdmin = profile?.role === 'admin'

  const items = [
    ...(isAdmin
      ? [
          {
            key: 'classes',
            title: 'Centres',
            subtitle: 'Créer, modifier et voir les centres',
          },
          {
            key: 'assistants',
            title: 'Assistants',
            subtitle: 'Voir, filtrer et gérer les assistants enregistrés',
          },
        ]
      : [
          {
            key: 'assistant-profile',
            title: 'Mon profil',
            subtitle: 'Ajouter ou modifier mes informations',
          },
        ]),

    {
      key: 'students',
      title: 'Étudiants',
      subtitle: isAdmin
        ? 'Inscription et gestion des étudiants'
        : 'Voir et gérer les étudiants de mon centre',
    },
    {
      key: 'couples',
      title: 'Couples',
      subtitle: isAdmin
        ? 'Lier deux étudiants comme conjoint'
        : 'Gérer les couples de mon centre',
    },
    {
      key: 'seances',
      title: 'Séances',
      subtitle: isAdmin
        ? 'Créer les séances et choisir le centre'
        : 'Gérer les séances de mon centre',
    },
    {
      key: 'rattrapages',
      title: 'Rattrapages',
      subtitle: isAdmin
        ? 'Gérer les cours rattrapés'
        : 'Rattraper les cours non faits',
    },
    {
      key: 'paiements',
      title: 'Paiements',
      subtitle: isAdmin
        ? 'Gérer inscriptions et contributions'
        : 'Gérer les paiements de mon centre',
    },
    {
      key: 'bilans',
      title: isAdmin ? 'Bilans' : 'Mon centre',
      subtitle: isAdmin
        ? 'Voir les statistiques générales'
        : 'Voir le bilan de mon centre',
    },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Accueil</h2>

        <div style={styles.verseBox}>
          <p style={styles.verse}>
            C’est lui (JESUS-CHRIST) qui est le Dieu véritable, et la vie éternelle...
          </p>
          <p style={styles.reference}>1 Jean 5:21</p>
        </div>

        <p style={styles.subtitle}>
          {isAdmin
            ? 'Choisis une rubrique'
            : `Bienvenue ${profile?.nom || 'assistant'}${
                profile?.class_nom ? ` • ${profile.class_nom}` : ''
              }`}
        </p>

        {onLogout && (
          <button
            type="button"
            style={styles.logoutButton}
            onClick={onLogout}
          >
            Déconnexion
          </button>
        )}
      </div>

      <div style={styles.grid}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            style={styles.card}
            onClick={() => onNavigate(item.key)}
          >
            <div style={styles.cardTitle}>{item.title}</div>
            <div style={styles.cardText}>{item.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: 20,
    maxWidth: 760,
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    background: '#f7f1fb',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: 32,
    color: '#2b0a78',
    fontWeight: 'bold',
  },
  verseBox: {
    marginTop: 18,
    marginBottom: 18,
    padding: 18,
    borderRadius: 18,
    background: '#fff',
    border: '2px solid #f0cde5',
  },
  verse: {
    margin: 0,
    color: '#d4148e',
    fontSize: 18,
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
  reference: {
    marginTop: 12,
    marginBottom: 0,
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 18,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    color: '#6f5b84',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  grid: {
    display: 'grid',
    gap: 18,
  },
  card: {
    width: '100%',
    textAlign: 'left',
    background: '#fff',
    border: '2px solid #eadcf9',
    borderRadius: 22,
    padding: 24,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2b0a78',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
  },
}
