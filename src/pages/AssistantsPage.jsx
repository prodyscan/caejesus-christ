import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import AssistantProfilePage from './AssistantProfilePage'

export default function AssistantsPage({ profile }) {
  const [assistants, setAssistants] = useState([])
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState('')
  const [filterClassId, setFilterClassId] = useState('all')
  const [message, setMessage] = useState('')
  const [selectedAssistant, setSelectedAssistant] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setMessage('')

    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, nom, annee')
      .order('nom', { ascending: true })

    if (classesError) {
      console.log(classesError)
      setMessage('Erreur chargement centres')
      return
    }

    setClasses(classesData || [])

    const { data: assistantsData, error: assistantsError } = await supabase
      .from('assistant_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (assistantsError) {
      console.log(assistantsError)
      setMessage('Erreur chargement assistants')
      return
    }

    setAssistants(assistantsData || [])
  }

  function getClassLabel(classId) {
    const classe = classes.find((c) => String(c.id) === String(classId))
    if (!classe) return '-'
    return `${classe.nom} - ${classe.annee}ère année`
  }

  async function deleteAssistant(id) {
    const ok = window.confirm('Supprimer cet assistant ?')
    if (!ok) return

    const { error } = await supabase
      .from('assistant_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression assistant')
      return
    }

    setMessage('Assistant supprimé')
    loadData()
  }

  const filteredAssistants = useMemo(() => {
    let result = assistants

    if (filterClassId !== 'all') {
      result = result.filter(
        (item) => String(item.class_id || '') === String(filterClassId)
      )
    }

    const term = search.trim().toLowerCase()

    if (!term) return result

    return result.filter((item) => {
      const text = [
        item.nom,
        item.sexe,
        item.ministere,
        item.telephone,
        item.pays,
        item.ville,
        item.centres_assistes,
        getClassLabel(item.class_id),
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(term)
    })
  }, [assistants, search, filterClassId, classes])

  if (selectedAssistant) {
    return (
      <AssistantProfilePage
        profile={profile}
        assistantId={selectedAssistant.id}
        classId={selectedAssistant.class_id || null}
        onBack={() => {
          setSelectedAssistant(null)
          loadData()
        }}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Assistants enregistrés</h2>

        <select
          style={styles.input}
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
        >
          <option value="all">Tous les centres</option>
          {classes.map((classe) => (
            <option key={classe.id} value={classe.id}>
              {classe.nom} - {classe.annee}ère année
            </option>
          ))}
        </select>

        <input
          style={styles.input}
          placeholder="Rechercher par nom, téléphone, ministère, ville, centre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste</h3>

        {filteredAssistants.length === 0 ? (
          <p>Aucun assistant enregistré.</p>
        ) : (
          filteredAssistants.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              <strong style={styles.name}>{item.nom || '-'}</strong>

              <p style={styles.meta}>Sexe : {item.sexe || '-'}</p>
              <p style={styles.meta}>Ministère : {item.ministere || '-'}</p>
              <p style={styles.meta}>Téléphone : {item.telephone || '-'}</p>
              <p style={styles.meta}>Pays : {item.pays || '-'}</p>
              <p style={styles.meta}>Ville : {item.ville || '-'}</p>
              <p style={styles.meta}>Centre : {getClassLabel(item.class_id)}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.viewButton}
                  onClick={() => setSelectedAssistant(item)}
                >
                  Voir
                </button>

                <button
                  type="button"
                  style={styles.editButton}
                  onClick={() => setSelectedAssistant(item)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.deleteButton}
                  onClick={() => deleteAssistant(item.id)}
                >
                  Supprimer
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
  card: {
    background: '#fff',
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
    textAlign: 'center',
    color: '#6f5b84',
    fontSize: 24,
    fontWeight: 'bold',
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
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  name: {
    color: '#2b0a78',
    fontSize: 20,
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
  viewButton: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#1565c0',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}
