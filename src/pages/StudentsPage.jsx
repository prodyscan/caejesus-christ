import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import StudentDetailPage from './StudentDetailPage'

const emptyForm = {
  nom: '',
  prenom: '',
  sexe: '',
  class_id: '',
  matricule: '',
  ministere: '',
  profession: '',
  denomination: '',
  quartier: '',
  signature: '',
}

export default function StudentsPage({ profile }) {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId = profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    getClasses()
    getStudents()
  }, [profile])

  async function getClasses() {
    let query = supabase
      .from('classes')
      .select('*')
      .order('nom', { ascending: true })

    if (!isAdmin && assistantClassId) {
      query = query.eq('id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement classes')
      return
    }

    setClasses(data || [])
  }

  async function getStudents() {
    let query = supabase
      .from('students')
      .select(`
        *,
        classes (
          nom,
          annee
        )
      `)
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

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function generateMatricule() {
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
    return 'CAE-' + randomPart
  }

  async function saveStudent(e) {
    e.preventDefault()
    setMessage('')

    if (!form.nom.trim()) {
      setMessage('Le nom est obligatoire')
      return
    }

    const finalClassId = isAdmin ? form.class_id : assistantClassId

    if (!finalClassId) {
      setMessage('Choisis une classe')
      return
    }

    if (!form.sexe) {
      setMessage('Choisis le sexe')
      return
    }

    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      sexe: form.sexe,
      class_id: finalClassId,
      matricule: editingId ? form.matricule : generateMatricule(),
      ministere: form.ministere.trim(),
      profession: form.profession.trim(),
      denomination: form.denomination.trim(),
      quartier: form.quartier.trim(),
      signature: form.signature.trim(),
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('students')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('students')
        .insert([payload])

      error = result.error
    }

    if (error) {
      console.log(error)
      setMessage(
        editingId
          ? 'Erreur modification étudiant'
          : 'Erreur ajout étudiant'
      )
      return
    }

    setForm(emptyForm)
    setEditingId(null)
    setMessage(editingId ? 'Étudiant modifié' : 'Étudiant ajouté')
    getStudents()
  }

  function editStudent(student) {
    setEditingId(student.id)
    setForm({
      nom: student.nom || '',
      prenom: student.prenom || '',
      sexe: student.sexe || '',
      class_id: student.class_id || '',
      matricule: student.matricule || '',
      ministere: student.ministere || '',
      profession: student.profession || '',
      denomination: student.denomination || '',
      quartier: student.quartier || '',
      signature: student.signature || '',
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  async function deleteStudent(id) {
    const ok = window.confirm('Supprimer cet étudiant ?')
    if (!ok) return

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression étudiant')
      return
    }

    setMessage('Étudiant supprimé')
    getStudents()
  }

  if (selectedStudentId) {
    return (
      <StudentDetailPage
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier étudiant' : 'Étudiants'}
        </h2>

        <form onSubmit={saveStudent}>
          <input
            style={styles.input}
            placeholder="Nom"
            name="nom"
            value={form.nom}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            placeholder="Prénom"
            name="prenom"
            value={form.prenom}
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

          {isAdmin ? (
            <select
              style={styles.input}
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
            >
              <option value="">Choisir une classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} - {c.annee}ère année
                </option>
              ))}
            </select>
          ) : (
            <div style={styles.infoBox}>
              Classe : {classes[0]?.nom || '-'}
            </div>
          )}

          <input
            style={styles.input}
            placeholder="Ministère"
            name="ministere"
            value={form.ministere}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            placeholder="Profession"
            name="profession"
            value={form.profession}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            placeholder="Dénomination"
            name="denomination"
            value={form.denomination}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            placeholder="Quartier"
            name="quartier"
            value={form.quartier}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            placeholder="Signature"
            name="signature"
            value={form.signature}
            onChange={handleChange}
          />

          {editingId && (
            <input
              style={styles.input}
              placeholder="Matricule"
              name="matricule"
              value={form.matricule}
              onChange={handleChange}
            />
          )}

          <button style={styles.addButton} type="submit">
            {editingId ? 'Modifier' : 'Ajouter'}
          </button>

          {editingId && (
            <button
              type="button"
              style={styles.cancelButton}
              onClick={cancelEdit}
            >
              Annuler
            </button>
          )}
        </form>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste</h3>

        {students.length === 0 ? (
          <p>Aucun étudiant enregistré.</p>
        ) : (
          students.map((s) => (
            <div key={s.id} style={styles.studentCard}>
              <div>
                <strong>
                  {s.nom} {s.prenom}
                </strong>

                <p style={styles.meta}>
                  Matricule : {s.matricule || '-'}
                </p>

                <p style={styles.meta}>
                  Classe : {s.classes?.nom || 'Aucune classe'}
                </p>

                <p style={styles.meta}>
                  Année : {s.classes?.annee || '-'}
                </p>

                <p style={styles.meta}>
                  Sexe : {s.sexe || '-'}
                </p>

                <p style={styles.meta}>
                  Ministère : {s.ministere || '-'}
                </p>

                <p style={styles.meta}>
                  Profession : {s.profession || '-'}
                </p>

                <p style={styles.meta}>
                  Dénomination : {s.denomination || '-'}
                </p>

                <p style={styles.meta}>
                  Quartier : {s.quartier || '-'}
                </p>

                <p style={styles.meta}>
                  Signature : {s.signature || '-'}
                </p>

                <p style={styles.meta}>
                  Couple : {s.couple_record_id ? 'Oui' : 'Non'}
                </p>
              </div>

              <div style={styles.row}>
                <button
                  style={styles.viewButton}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  Voir
                </button>

                <button
                  style={styles.editButton}
                  onClick={() => editStudent(s)}
                >
                  Modifier
                </button>

                <button
                  style={styles.deleteButton}
                  onClick={() => deleteStudent(s.id)}
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
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 10px 24px rgba(43, 10, 120, 0.08)',
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
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  },

  input: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
    color: '#333',
  },

  infoBox: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    border: '2px solid #eadcf9',
    background: '#fff7fc',
    color: '#2b0a78',
    fontWeight: 'bold',
    boxSizing: 'border-box',
    textAlign: 'center',
  },

  addButton: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
    boxShadow: '0 8px 18px rgba(212, 20, 142, 0.18)',
  },

  cancelButton: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 16,
  },

  studentCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    background: '#ffffff',
    boxShadow: '0 10px 25px rgba(43, 10, 120, 0.08)',
    border: '2px solid #f0e6ff',
  },

  row: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },

  viewButton: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 14,
    border: 'none',
    background: '#1565c0',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    boxShadow: '0 6px 14px rgba(21, 101, 192, 0.22)',
  },

  editButton: {
    flex: 1,
    minWidth: 110,
    padding: 12,
    borderRadius: 14,
    border: 'none',
    background: '#444',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    boxShadow: '0 6px 14px rgba(68, 68, 68, 0.2)',
  },

  deleteButton: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 14,
    border: 'none',
    background: '#d32f2f',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    boxShadow: '0 6px 14px rgba(211, 47, 47, 0.2)',
  },

  meta: {
    margin: '7px 0',
    color: '#444',
    wordBreak: 'break-word',
    fontSize: 16,
    lineHeight: 1.5,
    textAlign: 'center',
  },

  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 16,
  },
}
