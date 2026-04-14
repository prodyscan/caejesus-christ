import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyForm = {
  nom: '',
  sexe: '',
  ministere: '',
  date_formation: '',
  date_assistanat: '',
  telephone: '',
  pays: '',
  ville: '',
  centres_assistes: '',
}

export default function AssistantProfilePage({
  profile,
  assistantId = null,
  classId = null,
  onBack = null,
}) {
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [resolvedAssistantId, setResolvedAssistantId] = useState(null)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    init()
  }, [assistantId, classId])

  async function init() {
    setLoadingData(true)

    if (assistantId) {
      await loadAssistantById(assistantId)
    } else if (classId) {
      await loadAssistantByClass(classId)
    }

    setLoadingData(false)
  }

  async function loadAssistantById(id) {
    const { data } = await supabase
      .from('assistant_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setResolvedAssistantId(data.id)
      fillForm(data)
    }
  }

  async function loadAssistantByClass(classId) {
    const { data } = await supabase
      .from('assistant_profiles')
      .select('*')
      .eq('class_id', classId)
      .limit(1)
      .maybeSingle()

    if (data) {
      setResolvedAssistantId(data.id)
      fillForm(data)
    }
  }

  function fillForm(data) {
    setForm({
      nom: data.nom || '',
      sexe: data.sexe || '',
      ministere: data.ministere || '',
      date_formation: data.date_formation || '',
      date_assistanat: data.date_assistanat || '',
      telephone: data.telephone || '',
      pays: data.pays || '',
      ville: data.ville || '',
      centres_assistes: data.centres_assistes || '',
    })
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function saveProfile(e) {
    e.preventDefault()
    setMessage('')

    if (!form.nom.trim()) {
      setMessage('Le nom est obligatoire')
      return
    }

    setLoading(true)

    const payload = {
      class_id: classId || null,
      nom: form.nom.trim(),
      sexe: form.sexe || null,
      ministere: form.ministere.trim() || null,
      date_formation: form.date_formation || null,
      date_assistanat: form.date_assistanat || null,
      telephone: form.telephone.trim() || null,
      pays: form.pays.trim() || null,
      ville: form.ville.trim() || null,
      centres_assistes: form.centres_assistes.trim() || null,
    }

    let error = null

    if (resolvedAssistantId) {
      const result = await supabase
        .from('assistant_profiles')
        .update(payload)
        .eq('id', resolvedAssistantId)

      error = result.error
    } else {
      const result = await supabase
        .from('assistant_profiles')
        .insert([payload])
        .select()
        .single()

      error = result.error

      if (result.data) {
        setResolvedAssistantId(result.data.id)
      }
    }

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement profil assistant')
      return
    }

    setMessage(resolvedAssistantId ? 'Profil modifié' : 'Profil créé')
  }

  if (loadingData) {
    return <p style={{ textAlign: 'center' }}>Chargement...</p>
  }

  return (
    <div style={styles.page}>
      
      {onBack && (
        <button style={styles.backButton} onClick={onBack}>
          ← Retour
        </button>
      )}

      <div style={styles.card}>
        <h2 style={styles.title}>Profil assistant</h2>

        <form onSubmit={saveProfile}>
          <input
            style={styles.input}
            name="nom"
            placeholder="Nom"
            value={form.nom}
            onChange={handleChange}
          />

          <select
            style={styles.input}
            name="sexe"
            value={form.sexe}
            onChange={handleChange}
          >
            <option value="">Choisir le sexe</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </select>

          <input
            style={styles.input}
            name="ministere"
            placeholder="Ministère"
            value={form.ministere}
            onChange={handleChange}
          />

          {/* ✅ Dates corrigées */}
          <label style={styles.label}>Date de formation</label>
          <input
            style={styles.input}
            type="date"
            name="date_formation"
            value={form.date_formation}
            onChange={handleChange}
          />

          <label style={styles.label}>Date d’assistanat</label>
          <input
            style={styles.input}
            type="date"
            name="date_assistanat"
            value={form.date_assistanat}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="telephone"
            placeholder="Numéro"
            value={form.telephone}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="pays"
            placeholder="Pays"
            value={form.pays}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="ville"
            placeholder="Ville"
            value={form.ville}
            onChange={handleChange}
          />

          <textarea
            style={styles.textarea}
            name="centres_assistes"
            placeholder="Centres assistés"
            value={form.centres_assistes}
            onChange={handleChange}
          />

          <button style={styles.button} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: 20 },
  card: {
    background: '#fff',
    padding: 20,
    borderRadius: 16,
    border: '2px solid #e3d8f5',
  },
  title: {
    textAlign: 'center',
    color: '#2b0a78',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    border: '2px solid #d8c8ef',
  },
  textarea: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    border: '2px solid #d8c8ef',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg,#2b0a78,#d4148e)',
    color: '#fff',
    fontWeight: 'bold',
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    color: '#d4148e',
    fontWeight: 'bold',
  },
  label: {
    fontWeight: 'bold',
    color: '#6f5b84',
    marginBottom: 6,
    display: 'block',
  },
  backButton: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    border: '2px solid #ccc',
    background: '#fff',
    fontWeight: 'bold',
  },
}
