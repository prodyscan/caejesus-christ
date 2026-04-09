import React from 'react'

export default function PortalPage({ onEnter }) {
  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <div style={styles.container}>
          <h1 style={styles.mainTitle}>
            Les Écoles et Universités de la Connaissance de JESUS-CHRIST,
            le Dieu Véritable
          </h1>

          <p style={styles.verse}>(Jean 5:20)</p>

          <div style={styles.presenceBox}>
            Liste de Présence effective aux cours
          </div>

          <div style={styles.topSection}>
            <div style={styles.infoBox}>

              <p style={styles.infoText}>
                Cours bibliques non théologiques avec l'Apôtre, Prédicateur et Docteur de
                JÉSUS-CHRIST,
                <br />
                <strong>Char d'Israël et sa Cavalerie</strong>,
                <br />
                Président mondial des Écoles et Universités de la Connaissance de
                JÉSUS-CHRIST, le Dieu Véritable.
                <br />
                <em>(1 Jean 5:20)</em>
              </p>


            </div>

            <div style={styles.yearBox}>
              <div style={styles.yearItem}>1ère année</div>
              <div style={styles.yearItem}>2ème année</div>
              <div style={styles.yearItem}>3ème année</div>
            </div>
          </div>

          <div style={styles.sloganBox}>
            <p style={styles.slogan}>Pour mieux Le servir hors du péché !</p>
          </div>

          <button style={styles.enterButton} onClick={onEnter}>
            Accéder
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #1b0a57 0%, #2b0a78 35%, #5e0c6d 70%, #7c0c58 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
  },
  overlay: {
    width: '100%',
    maxWidth: 950,
  },
  container: {
    background: 'rgba(255,255,255,0.96)',
    border: '3px solid #ffffff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
  },
  mainTitle: {
    textAlign: 'center',
    color: '#2b0a78',
    fontSize: 28,
    lineHeight: 1.25,
    marginTop: 0,
    marginBottom: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  verse: {
    textAlign: 'center',
    color: '#d4148e',
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: 18,
    fontSize: 16,
  },
  presenceBox: {
    border: '2px solid #2b0a78',
    color: '#333',
    background: '#fff',
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
    fontSize: 20,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  topSection: {
    display: 'flex',
    gap: 16,
    alignItems: 'stretch',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  infoBox: {
    flex: 2,
    minWidth: 260,
    border: '2px solid #111',
    background: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    margin: 0,
    textAlign: 'left',
    fontSize: 15,
    lineHeight: 1.7,
    color: '#111',
  },
  yearBox: {
    flex: 1,
    minWidth: 180,
    border: '2px solid #111',
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 14,
  },
  yearItem: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#2b0a78',
    border: '1px solid #d9d9d9',
    borderRadius: 10,
    padding: '12px 10px',
    background: '#fafafa',
  },
  sloganBox: {
    border: '2px solid #d4148e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    background: '#fff7fc',
  },
  slogan: {
    margin: 0,
    textAlign: 'center',
    color: '#d4148e',
    fontSize: 30,
    lineHeight: 1.2,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  enterButton: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(90deg, #d91e18 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
  },
}
