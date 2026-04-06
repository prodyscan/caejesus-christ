import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import SeanceDetailPage from './SeanceDetailPage'

export default function CentreDetailPage({ classId, onBack }) {
  const [centre, setCentre] = useState(null)
  const [seances, setSeances] = useState([])
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [searchSeance, setSearchSeance] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadCentreData()
  }, [classId])

  async function loadCentreData() {
    setMessage('')

    const { data: centreData, error: centreError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    if (centreError) {
      console.log(centreError)
      setMessage('Erreur chargement centre')
      return
    }

    setCentre(centreData)

    const { data: seancesData, error: seancesError } = await supabase
      .from('seances')
      .select('*')
      .eq('class_id', classId)
      .order('date_seance', { ascending: true })

    if (seancesError) {
      console.log(seancesError)
      setMessage('Erreur chargement séances')
      return
    }

    setSeances(seancesData || [])
  }

  const filteredSeances = useMemo(() => {
    const term = searchSeance.trim().toLowerCase()

    if (!term) return seances

    return seances.filter((seance) => {
      const text = [
        seance.chapitre || '',
        seance.date_seance || '',
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(term)
    })
  }, [seances, searchSeance])

  if (selectedSeanceId) {
    return (
      <SeanceDetailPage
        seanceId={selectedSeanceId}
        onBack={() => {
          setSelectedSeanceId(null)
          loadCentreData()
        }}
      />
    )
  }

  return (
    <div style={styles.page}>
      <button type="button" style={styles.backButton} onClick={onBack}>
        ← Retour aux centres
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>{centre?.nom || 'Centre'}</h2>

        <p style={styles.meta}>
          <strong>Année :</strong> {centre?.annee || '-'}
        </p>
        <p style={styles.meta}>
          <strong>Pays :</strong> {centre?.pays || '-'}
        </p>
        <p style={styles.meta}>
          <strong>Ville :</strong> {centre?.ville || '-'}
        </p>
        <p style={styles.meta}>
          <strong>Assistant :</strong> {centre?.assistant_nom || '-'}
        </p>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Séances du centre</h3>

        <input
          style={styles.input}
          placeholder="Chercher une séance par chapitre ou date..."
          value={searchSeance}
          onChange={(e) => setSearchSeance(e.target.value)}
        />

        <p style={styles.resultText}>
          {filteredSeances.length} séance{filteredSeances.length > 1 ? 's' : ''}
        </p>

        {filteredSeances.length === 0 ? (
          <p>Aucune séance trouvée.</p>
        ) : (
          filteredSeances.map((seance) => (
            <div key={seance.id} style={styles.itemCard}>
              <strong style={styles.itemTitle}>
                {seance.chapitre || '-'}
              </strong>

              <p style={styles.meta}>Date : {seance.date_seance || '-'}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.openButton}
                  onClick={() => setSelectedSeanceId(seance.id)}
                >
                  Ouvrir séance
                </button>
              </div>
            </div>
          ))
        )}
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
  backButton: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #2b0a78',
    background: '#fff',
    color: '#2b0a78',
    marginBottom: 14,
    fontWeight: 'bold',
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
  },
  title: {
    marginTop: 0,
    marginBottom: 16,
    textAlign: 'center',
    color: '#2b0a78',
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: '#6f5b84',
    textAlign: 'center',
    fontSize: 24,
  },
  input: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
  },
  resultText: {
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
    color: '#6f5b84',
    fontWeight: 'bold',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  itemTitle: {
    color: '#2b0a78',
    fontSize: 20,
    whiteSpace: 'pre-wrap',
  },
  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  openButton: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}
