import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import CentreDetailPage from './CentreDetailPage'
import AssistantProfilePage from './AssistantProfilePage'

const emptyClassForm = {
  nom: '',
  annee: '1',
  pays: '',
  ville: '',
  assistant_code: '',
  assistant_password: '',
}

export default function ClassesPage({ profile }) {
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(emptyClassForm)
  const [editingId, setEditingId] = useState(null)
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [selectedAssistantClass, setSelectedAssistantClass] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getClasses()
  }, [])

  async function getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement centres')
      return
    }

    setClasses(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function extractLastNumber(value) {
    const match = String(value || '').match(/(\d+)$/)
    return match ? Number(match[1]) : 0
  }

  function padNumber(value, size) {
    return String(value).padStart(size, '0')
  }

  function getVillePrefix(ville) {
    const clean = String(ville || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .trim()

    if (!clean) return 'Abj'

    const lower = clean.toLowerCase()

    if (lower.startsWith('abidjan')) return 'Abj'
    if (lower.startsWith('cocody')) return 'Coc'
    if (lower.startsWith('bouake')) return 'Bou'
    if (lower.startsWith('yamoussoukro')) return 'Yam'
    if (lower.startsWith('korhogo')) return 'Kor'
    if (lower.startsWith('daloa')) return 'Dal'
    if (lower.startsWith('sanpedro')) return 'San'
    if (lower.startsWith('bingerville')) return 'Bin'
    if (lower.startsWith('anyama')) return 'Any'

    const first = clean.charAt(0).toUpperCase()
    const second = clean.charAt(1)?.toLowerCase() || 'a'
    const third = clean.charAt(2)?.toLowerCase() || 'a'

    return `${first}${second}${third}`
  }

  function generateNextAssistantCode(existingClasses) {
    const maxNumber = (existingClasses || []).reduce((max, item) => {
      const current = extractLastNumber(item.assistant_code)
      return current > max ? current : max
    }, 0)

    return `CAEJ${padNumber(maxNumber + 1, 5)}`
  }

  function generateNextAssistantPassword(existingClasses, ville) {
    const prefix = getVillePrefix(ville)

    const samePrefix = (existingClasses || []).filter((item) =>
      String(item.assistant_password || '').startsWith(prefix)
    )

    const maxNumber = samePrefix.reduce((max, item) => {
      const current = extractLastNumber(item.assistant_password)
      return current > max ? current : max
    }, 0)

    return `${prefix}${padNumber(maxNumber + 1, 4)}`
  }

  async function saveClass(e) {
    e.preventDefault()
    setMessage('')

    const nomNettoye = form.nom.trim().toLowerCase()

    if (!form.nom.trim()) {
      setMessage('Le nom du centre est obligatoire')
      return
    }

    if (!form.ville.trim()) {
      setMessage('La ville est obligatoire')
      return
    }

    const generatedAssistantCode = editingId
      ? form.assistant_code.trim()
      : generateNextAssistantCode(classes)

    const generatedAssistantPassword = editingId
      ? form.assistant_password.trim()
      : generateNextAssistantPassword(classes, form.ville)

    const duplicate = classes.find((c) => {
      if (editingId && String(c.id) === String(editingId)) return false

      const sameNom = (c.nom || '').trim().toLowerCase() === nomNettoye
      const sameCode =
        (c.assistant_code || '').trim() === generatedAssistantCode

      return sameNom || sameCode
    })

    if (duplicate) {
      if ((duplicate.nom || '').trim().toLowerCase() === nomNettoye) {
        setMessage('Ce centre existe déjà')
        return
      }

      if ((duplicate.assistant_code || '').trim() === generatedAssistantCode) {
        setMessage('Ce code assistant existe déjà')
        return
      }
    }

    setLoading(true)

    const payload = {
      nom: form.nom.trim(),
      annee: Number(form.annee),
      pays: form.pays.trim(),
      ville: form.ville.trim(),
      assistant_code: generatedAssistantCode,
      assistant_password: generatedAssistantPassword,
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('classes')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('classes')
        .insert([payload])

      error = result.error
    }

    setLoading(false)

    if (error) {
      console.log(error)

      const errorMessage = error.message?.toLowerCase() || ''

      if (errorMessage.includes('assistant_code')) {
        setMessage('Ce code assistant existe déjà')
        return
      }

      if (errorMessage.includes('nom')) {
        setMessage('Ce centre existe déjà')
        return
      }

      setMessage('Erreur enregistrement centre')
      return
    }

    setMessage(editingId ? 'Centre modifié' : 'Centre ajouté')
    setForm(emptyClassForm)
    setEditingId(null)
    getClasses()
  }

  function editClass(classe) {
    setEditingId(classe.id)
    setForm({
      nom: classe.nom || '',
      annee: String(classe.annee || '1'),
      pays: classe.pays || '',
      ville: classe.ville || '',
      assistant_code: classe.assistant_code || '',
      assistant_password: classe.assistant_password || '',
    })
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyClassForm)
    setMessage('')
  }

  async function deleteClass(id) {
    const ok = window.confirm('Supprimer ce centre ?')
    if (!ok) return

    const { count: studentsCount, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', id)

    if (studentsError) {
      console.log(studentsError)
      setMessage('Erreur vérification étudiants')
      return
    }

    const { count: seancesCount, error: seancesError } = await supabase
      .from('seances')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', id)

    if (seancesError) {
      console.log(seancesError)
      setMessage('Erreur vérification séances')
      return
    }

    if ((studentsCount || 0) > 0 || (seancesCount || 0) > 0) {
      setMessage(
        'Impossible de supprimer : ce centre contient encore des étudiants ou des séances'
      )
      return
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage(error.message || 'Erreur suppression centre')
      return
    }

    setMessage('Centre supprimé avec succès')
    getClasses()
  }

  async function openAssistantProfile(classe) {
    const { data, error } = await supabase
      .from('assistant_profiles')
      .select('id')
      .eq('class_id', classe.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.log(error)
      setMessage('Erreur ouverture profil assistant')
      return
    }

    setSelectedAssistantClass({
      classId: classe.id,
      assistantId: data?.id || null,
    })
  }

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return classes

    return classes.filter((classe) => {
      const text = [
        classe.nom,
        String(classe.annee || ''),
        classe.pays,
        classe.ville,
        classe.assistant_code,
        classe.assistant_password,
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(term)
    })
  }, [classes, search])

  if (selectedAssistantClass) {
    return (
      <AssistantProfilePage
        profile={profile}
        assistantId={selectedAssistantClass.assistantId}
        classId={selectedAssistantClass.classId}
        onBack={() => {
          setSelectedAssistantClass(null)
          getClasses()
        }}
      />
    )
  }

  if (selectedClassId) {
    return (
      <CentreDetailPage
        classId={selectedClassId}
        onBack={() => {
          setSelectedClassId(null)
          getClasses()
        }}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier centre' : 'Centres'}
        </h2>

        <form onSubmit={saveClass}>
          <input
            style={styles.input}
            name="nom"
            placeholder="Nom du centre"
            value={form.nom}
            onChange={handleChange}
          />

          <select
            style={styles.input}
            name="annee"
            value={form.annee}
            onChange={handleChange}
          >
            <option value="1">1ère année</option>
            <option value="2">2ème année</option>
            <option value="3">3ème année</option>
          </select>

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

          <input
            style={styles.input}
            name="assistant_code"
            placeholder="Code assistant"
            value={
              editingId
                ? form.assistant_code
                : generateNextAssistantCode(classes)
            }
            readOnly
          />

          <input
            style={styles.input}
            name="assistant_password"
            placeholder="Mot de passe assistant"
            value={
              editingId
                ? form.assistant_password
                : generateNextAssistantPassword(classes, form.ville)
            }
            readOnly
          />

          <button
            style={styles.primaryButtonFull}
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Enregistrement...'
              : editingId
              ? 'Modifier centre'
              : 'Ajouter centre'}
          </button>

          {editingId && (
            <button
              type="button"
              style={styles.secondaryButtonFull}
              onClick={cancelEdit}
            >
              Annuler modification
            </button>
          )}
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Recherche rapide</h3>

        <input
          style={styles.input}
          placeholder="Chercher par centre, assistant, code, mot de passe, ville, pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <p style={styles.resultText}>
          {filteredClasses.length} résultat{filteredClasses.length > 1 ? 's' : ''}
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste des centres</h3>

        {filteredClasses.length === 0 ? (
          <p>Aucun centre trouvé.</p>
        ) : (
          filteredClasses.map((classe) => (
            <div key={classe.id} style={styles.itemCard}>
              <strong style={styles.className}>{classe.nom}</strong>
              <p style={styles.meta}>Année : {classe.annee}</p>
              <p style={styles.meta}>Pays : {classe.pays || '-'}</p>
              <p style={styles.meta}>Ville : {classe.ville || '-'}</p>
              <p style={styles.meta}>
                Code assistant : {classe.assistant_code || '-'}
              </p>
              <p style={styles.meta}>
                Mot de passe assistant : {classe.assistant_password || '-'}
              </p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.viewButton}
                  onClick={() => setSelectedClassId(classe.id)}
                >
                  Voir
                </button>

                <button
                  type="button"
                  style={styles.profileButton}
                  onClick={() => openAssistantProfile(classe)}
                >
                  Profil assistant
                </button>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => editClass(classe)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deleteClass(classe.id)}
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
    marginBottom: 0,
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
  className: {
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
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#1565c0',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  profileButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#6f5b84',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  primaryButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  dangerButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#d91e18',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  primaryButtonFull: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  secondaryButtonFull: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
}
