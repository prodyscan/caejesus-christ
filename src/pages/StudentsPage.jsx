import { useEffect, useRef, useState } from 'react'
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

  telephone: '',
  telephone_secondaire: '',
  email: '',
  date_naissance: '',
  date_naissance_text: '',
  lieu_naissance: '',
  date_ajout_etudiant: '',
}

export default function StudentsPage({ profile }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [classes, setClasses] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const formRef = useRef(null)

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

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
      setMessage('Erreur chargement centres')
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

  function handleDateTextChange(e) {
    const value = e.target.value

    setForm((prev) => ({
      ...prev,
      date_naissance_text: value,
    }))

    const cleaned = value.trim()

    const matchFr = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (matchFr) {
      const [, day, month, year] = matchFr
      setForm((prev) => ({
        ...prev,
        date_naissance_text: value,
        date_naissance: `${year}-${month}-${day}`,
      }))
      return
    }

    const matchIso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (matchIso) {
      const [, year, month, day] = matchIso
      setForm((prev) => ({
        ...prev,
        date_naissance_text: value,
        date_naissance: `${year}-${month}-${day}`,
        annee_naissance: year,
      }))
    }
  }

  function generateMatricule() {
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
    return 'CAE-' + randomPart
  }

  function formatPhoneForLink(phone) {
    if (!phone) return ''
    return String(phone).replace(/[^\d+]/g, '')
  }

  function openWhatsApp(phone) {
    const cleanPhone = formatPhoneForLink(phone)
    if (!cleanPhone) {
      setMessage('Aucun numéro téléphone')
      return
    }

    window.open(`https://wa.me/${cleanPhone.replace('+', '')}`, '_blank')
    setOpenMenuId(null)
  }

  function callStudent(phone) {
    const cleanPhone = formatPhoneForLink(phone)
    if (!cleanPhone) {
      setMessage('Aucun numéro téléphone')
      return
    }

    window.location.href = `tel:${cleanPhone}`
    setOpenMenuId(null)
  }

  async function toggleCertificat(student) {
    if (!isAdmin) {
      setMessage("Seul l'administrateur peut valider le certificat")
      return
    }

    const actionLabel = student.certificat_recu
      ? 'retirer la validation du certificat'
      : 'confirmer que cet étudiant a reçu son certificat'

    const ok = window.confirm(`Voulez-vous ${actionLabel} ?`)
    if (!ok) return

    const payload = {
      certificat_recu: !student.certificat_recu,
      date_reception_certificat: !student.certificat_recu
        ? new Date().toISOString().slice(0, 10)
        : null,
    }

    const { error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', student.id)

    if (error) {
      console.log(error)
      setMessage('Erreur mise à jour certificat')
      return
    }

    setMessage(
      !student.certificat_recu
        ? 'Certificat validé'
        : 'Validation certificat retirée'
    )

    setOpenMenuId(null)
    getStudents()
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
      setMessage('Choisis un centre')
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

      telephone: form.telephone || '',
      telephone_secondaire: form.telephone_secondaire || '',
      email: form.email || '',
      date_naissance: form.date_naissance || null,
      lieu_naissance: form.lieu_naissance || '',
      date_ajout_etudiant:
        form.date_ajout_etudiant || new Date().toISOString().slice(0, 10),
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

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
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

      telephone: student.telephone || '',
      telephone_secondaire: student.telephone_secondaire || '',
      email: student.email || '',
      date_naissance: student.date_naissance || '',
      date_naissance_text: student.date_naissance
        ? `${student.date_naissance.slice(8, 10)}/${student.date_naissance.slice(5, 7)}/${student.date_naissance.slice(0, 4)}`
        : '',
      lieu_naissance: student.lieu_naissance || '',
      date_ajout_etudiant: student.date_ajout_etudiant || '',
    })

    setMessage('')
    setOpenMenuId(null)

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
    setOpenMenuId(null)

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
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
    setOpenMenuId(null)
    getStudents()
  }

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
    const matricule = (student.matricule || '').toLowerCase()
    const telephone = (student.telephone || '').toLowerCase()
    const email = (student.email || '').toLowerCase()

    return (
      fullName.includes(query) ||
      matricule.includes(query) ||
      telephone.includes(query) ||
      email.includes(query)
    )
  })

  if (selectedStudentId) {
    return (
      <StudentDetailPage
        studentId={selectedStudentId}
        profile={profile}
        onBack={() => {
          setSelectedStudentId(null)
          getStudents()
        }}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div
        ref={formRef}
        style={{
          ...styles.card,
          ...(editingId ? styles.cardEditing : {}),
        }}
      >
        <h2 style={styles.title}>
          {editingId ? 'Modifier cet étudiant' : 'Étudiants'}
        </h2>

        {editingId && (
          <div style={styles.editNotice}>Mode modification activé</div>
        )}

        <form onSubmit={saveStudent}>

          {isAdmin ? (
            <select
              style={styles.input}
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
            >
              <option value="">Choisir un centre</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} - {c.annee}ère année
                </option>
              ))}
            </select>
          ) : (
            <div style={styles.infoBox}>
              Centre : {classes[0]?.nom || '-'}
            </div>
          )}

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

          <input
            style={styles.input}
            name="telephone"
            placeholder="Numéro de téléphone"
            value={form.telephone}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="telephone_secondaire"
            placeholder="Numéro téléphonique secondaire"
            value={form.telephone_secondaire}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="date_naissance_text"
            type="text"
            inputMode="numeric"
            placeholder="Date de naissance (ex: 15/08/1993)"
            value={form.date_naissance_text}
            onChange={handleDateTextChange}
          />


          <input
            style={styles.input}
            name="lieu_naissance"
            placeholder="Lieu de naissance"
            value={form.lieu_naissance}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="date_ajout_etudiant"
            type="text"
            placeholder="Date d'ajout étudiant"
            value={form.date_ajout_etudiant}
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => {
              if (!e.target.value) e.target.type = 'text'
            }}
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

        <input
          style={styles.input}
          placeholder="Rechercher par nom, matricule, téléphone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredStudents.length === 0 ? (
          <p style={styles.emptyText}>Aucun étudiant enregistré.</p>
        ) : (
          filteredStudents.map((s) => (
            <div key={s.id} style={styles.studentCard}>
              <div style={styles.studentTopRow}>
                <div style={styles.nameRow}>
                  <strong style={styles.studentName}>
                    {s.nom} {s.prenom}
                  </strong>

                  {s.certificat_recu && (
                    <span style={styles.certBadge}>
                      Certificat reçu
                    </span>
                  )}
                </div>

                <div style={styles.menuWrapper}>
                  <button
                    type="button"
                    style={styles.menuButton}
                    onClick={() =>
                      setOpenMenuId(openMenuId === s.id ? null : s.id)
                    }
                  >
                    ⋮
                  </button>

                  {openMenuId === s.id && (
                    <div style={styles.dropdown}>
                      <button
                        type="button"
                        style={styles.dropdownItem}
                        onClick={() => {
                          setSelectedStudentId(s.id)
                          setOpenMenuId(null)
                        }}
                      >
                        Voir
                      </button>

                      <button
                        type="button"
                        style={styles.dropdownItem}
                        onClick={() => openWhatsApp(s.telephone)}
                      >
                        WhatsApp
                      </button>

                      <button
                        type="button"
                        style={styles.dropdownItem}
                        onClick={() => callStudent(s.telephone)}
                      >
                        Appeler
                      </button>

                      <button
                        type="button"
                        style={styles.dropdownItem}
                        onClick={() => editStudent(s)}
                      >
                        Modifier
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          style={styles.dropdownItem}
                          onClick={() => toggleCertificat(s)}
                        >
                          {s.certificat_recu
                            ? 'Retirer certificat'
                            : 'Valider certificat'}
                        </button>
                      )}

                      <button
                        type="button"
                        style={{
                          ...styles.dropdownItem,
                          color: '#d91e18',
                        }}
                        onClick={() => deleteStudent(s.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
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

  cardEditing: {
    border: '2px solid #d4148e',
    boxShadow: '0 12px 26px rgba(212, 20, 142, 0.14)',
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

  editNotice: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: '#fff7fc',
    border: '2px solid #f0cde5',
    color: '#d4148e',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  fieldLabel: {
    display: 'block',
    marginBottom: 6,
    marginTop: 4,
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 15,
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

  studentTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  nameRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },

  studentName: {
    color: '#1565c0',
    fontSize: 22,
    fontWeight: 'bold',
    wordBreak: 'break-word',
  },

  certBadge: {
    display: 'inline-block',
    width: 'fit-content',
    padding: '8px 14px',
    borderRadius: 999,
    background: '#1565c0',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },

  menuWrapper: {
    position: 'relative',
  },

  menuButton: {
    border: 'none',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 28,
    fontWeight: 'bold',
    padding: '0 8px',
    lineHeight: 1,
  },

  dropdown: {
    position: 'absolute',
    right: 0,
    top: 36,
    minWidth: 190,
    background: '#fff',
    border: '2px solid #eadcf9',
    borderRadius: 14,
    boxShadow: '0 10px 22px rgba(43, 10, 120, 0.14)',
    overflow: 'hidden',
    zIndex: 20,
  },

  dropdownItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: 14,
    border: 'none',
    background: '#fff',
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 15,
    borderBottom: '1px solid #f1e9fb',
  },

  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 16,
  },

  emptyText: {
    textAlign: 'center',
    color: '#555',
  },
}
