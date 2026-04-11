import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CouplesPage({ profile }) {
  const [students, setStudents] = useState([])
  const [couples, setCouples] = useState([])
  const [searchHomme, setSearchHomme] = useState('')
  const [searchFemme, setSearchFemme] = useState('')
  const [form, setForm] = useState({
    student1_id: '',
    student2_id: '',
  })
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    getStudents()
    getCouples()
  }, [profile])

  async function getStudents() {
    let query = supabase
      .from('students')
      .select('*')
      .order('nom', { ascending: true })

    if (!isAdmin && assistantClassId) {
      query = query.eq('class_id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement étudiants')
      return
    }

    setStudents(data || [])
  }

  async function getCouples() {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
      setMessage('Erreur chargement couples')
      return
    }

    if (isAdmin) {
      setCouples(data || [])
      return
    }

    const filtered = (data || []).filter((couple) => {
      const ids = [couple.student1_id, couple.student2_id]
      return students.some((s) => ids.includes(s.id))
    })

    setCouples(filtered)
  }

  useEffect(() => {
    if (!isAdmin && students.length > 0) {
      getCouples()
    }
  }, [students])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function getStudentName(id) {
    const student = students.find((s) => String(s.id) === String(id))
    if (!student) return '-'
    return `${student.nom || ''} ${student.prenom || ''}`.trim()
  }

  const hommesDisponibles = useMemo(() => {
    const query = searchHomme.trim().toLowerCase()

    return students
      .filter((s) => s.sexe === 'homme' && !s.couple_record_id)
      .filter((student) => {
        if (!query) return true

        const fullName =
          `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()

        return fullName.includes(query)
      })
  }, [students, searchHomme])

  const femmesDisponibles = useMemo(() => {
    const query = searchFemme.trim().toLowerCase()

    return students
      .filter((s) => s.sexe === 'femme' && !s.couple_record_id)
      .filter((student) => {
        if (!query) return true

        const fullName =
          `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()

        return fullName.includes(query)
      })
  }, [students, searchFemme])

  async function createCouple(e) {
    e.preventDefault()
    setMessage('')

    if (!form.student1_id || !form.student2_id) {
      setMessage("Choisis l'homme et la femme")
      return
    }

    if (form.student1_id === form.student2_id) {
      setMessage('Impossible de choisir la même personne')
      return
    }

    const homme = students.find((s) => String(s.id) === String(form.student1_id))
    const femme = students.find((s) => String(s.id) === String(form.student2_id))

    if (!homme || !femme) {
      setMessage('Étudiants introuvables')
      return
    }

    if (!isAdmin) {
      if (
        String(homme.class_id) !== String(assistantClassId) ||
        String(femme.class_id) !== String(assistantClassId)
      ) {
        setMessage('Tu ne peux gérer que les couples de ta classe')
        return
      }
    }

    if (homme.sexe !== 'homme') {
      setMessage("Le premier choix doit être un homme")
      return
    }

    if (femme.sexe !== 'femme') {
      setMessage("Le deuxième choix doit être une femme")
      return
    }

    if (homme.couple_record_id || femme.couple_record_id) {
      setMessage('Une des deux personnes est déjà dans un couple')
      return
    }

    const { data, error } = await supabase
      .from('couples')
      .insert({
        student1_id: form.student1_id,
        student2_id: form.student2_id,
      })
      .select()
      .single()

    if (error) {
      console.log(error)
      setMessage(error.message)
      return
    }

    const coupleId = data.id

    const { error: updateError } = await supabase
      .from('students')
      .update({ couple_record_id: coupleId })
      .in('id', [form.student1_id, form.student2_id])

    if (updateError) {
      console.log(updateError)
      setMessage('Couple créé mais liaison étudiants échouée')
      return
    }

    setForm({
      student1_id: '',
      student2_id: '',
    })
    setSearchHomme('')
    setSearchFemme('')

    setMessage('Couple créé avec succès')
    getStudents()
    getCouples()
  }

  async function deleteCouple(couple) {
    const ok = window.confirm('Supprimer ce couple ?')
    if (!ok) return

    if (!isAdmin) {
      const ids = [couple.student1_id, couple.student2_id]
      const allowed = students.some((s) => ids.includes(s.id))
      if (!allowed) {
        setMessage("Tu ne peux supprimer que les couples de ta classe")
        return
      }
    }

    await supabase
      .from('students')
      .update({ couple_record_id: null })
      .in('id', [couple.student1_id, couple.student2_id])

    const { error } = await supabase
      .from('couples')
      .delete()
      .eq('id', couple.id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression couple')
      return
    }

    setMessage('Couple supprimé')
    getStudents()
    getCouples()
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Couples</h2>

        <form onSubmit={createCouple}>
          <input
            style={styles.input}
            placeholder="Rechercher l’homme..."
            value={searchHomme}
            onChange={(e) => setSearchHomme(e.target.value)}
          />

          <select
            style={styles.input}
            name="student1_id"
            value={form.student1_id}
            onChange={handleChange}
          >
            <option value="">Choisir l’homme</option>
            {hommesDisponibles.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nom} {student.prenom}
              </option>
            ))}
          </select>

          <input
            style={styles.input}
            placeholder="Rechercher la femme..."
            value={searchFemme}
            onChange={(e) => setSearchFemme(e.target.value)}
          />

          <select
            style={styles.input}
            name="student2_id"
            value={form.student2_id}
            onChange={handleChange}
          >
            <option value="">Choisir la femme</option>
            {femmesDisponibles.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nom} {student.prenom}
              </option>
            ))}
          </select>

          <button style={styles.addButton} type="submit">
            Créer le couple
          </button>
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste des couples</h3>

        {couples.length === 0 ? (
          <p>Aucun couple enregistré.</p>
        ) : (
          couples.map((couple) => (
            <div key={couple.id} style={styles.coupleCard}>
              <strong>
                {getStudentName(couple.student1_id)} +{' '}
                {getStudentName(couple.student2_id)}
              </strong>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.deleteButton}
                  onClick={() => deleteCouple(couple)}
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
    background: '#fff',
    boxSizing: 'border-box',
  },

  addButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  coupleCard: {
    border: '1px solid #e3e3e3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    background: '#fafafa',
  },

  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },

  deleteButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#c62828',
    color: '#fff',
  },

  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
  },
}
