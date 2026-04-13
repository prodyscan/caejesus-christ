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
  const [certificatStudentId, setCertificatStudentId] = useState(null)
  const [certificatDate, setCertificatDate] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const certificatBoxRef = useRef(null)

  const [showSmsPanel, setShowSmsPanel] = useState(false)
  const [smsFilter, setSmsFilter] = useState('tous')
  const [smsType, setSmsType] = useState('rapide')
  const [smsMessage, setSmsMessage] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [smsBatchSize, setSmsBatchSize] = useState(25)
  const [sentStudentIds, setSentStudentIds] = useState([])
  const [studentSmsStats, setStudentSmsStats] = useState({})

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  const defaultSmsMessages = {
    inscription:
      `Soyez bénis au Nom de PAPA JESUS-CHRIST,\n\nnous vous rappelons que votre inscription n’est pas encore soldée. Merci de vous rapprocher du centre pour régulariser votre situation.`,
    contribution:
      `Soyez bénis au Nom de PAPA JESUS-CHRIST,\n\nnous vous informons que votre contribution n’est pas encore à jour. Merci de vous rapprocher du centre pour régulariser votre situation.`,
    absence:
      `Soyez bénis au Nom de PAPA JESUS-CHRIST,\n\nnous avons constaté votre absence aux dernières séances. Merci de reprendre contact avec le centre pour la suite des enseignements.`,
  }

  useEffect(() => {
    getClasses()
    getStudents()
  }, [profile])

  useEffect(() => {
    updateSmsMessage(smsType, smsFilter)
  }, [])


  useEffect(() => {
    if (!isAdmin) {
      setShowSmsPanel(false)
      setSelectedStudentIds([])
    }
  }, [isAdmin])

  useEffect(() => {
    if (students.length > 0) {
      loadStudentSmsStats()
    } else {
      setStudentSmsStats({})
    }
  }, [students])

  function countCoursesInSeance(chapitreText) {
    if (!chapitreText) return 0

    return String(chapitreText)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
  }

  async function getValidatedCoursesBeforeTransfer(studentId, classId) {
    const { data: presencesData, error: presencesError } = await supabase
      .from('presences')
      .select('seance_id, statut')
      .eq('student_id', studentId)
      .eq('statut', 'present')

    if (presencesError) {
      console.log(presencesError)
      return 0
    }

    const { data: seancesData, error: seancesError } = await supabase
      .from('seances')
      .select('id, chapitre, class_id')
      .eq('class_id', classId)

    if (seancesError) {
      console.log(seancesError)
      return 0
    }

    const seanceMap = {}
    ;(seancesData || []).forEach((s) => {
      seanceMap[s.id] = s
    })

    return (presencesData || []).reduce((sum, presence) => {
      const seance = seanceMap[presence.seance_id]
      if (!seance) return sum
      return sum + countCoursesInSeance(seance.chapitre)
    }, 0)
  }

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
        classes!students_class_id_fkey (
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

  async function loadStudentSmsStats() {
    const { data: paiementsData, error: paiementsError } = await supabase
      .from('paiements')
      .select('*')

    const { data: presencesData, error: presencesError } = await supabase
      .from('presences')
      .select('*')

    if (paiementsError) {
      console.log(paiementsError)
      return
    }

    if (presencesError) {
      console.log(presencesError)
      return
    }

    const statsMap = {}

    students.forEach((student) => {
      const studentPaiements = (paiementsData || []).filter(
        (p) => String(p.student_id) === String(student.id)
      )

      const studentPresences = (presencesData || []).filter(
        (p) => String(p.student_id) === String(student.id)
      )

      const inscriptionPaid = studentPaiements
        .filter(
          (p) =>
            p.type_paiement === 'inscription' ||
            p.type_paiement === 'inscription_arrieree'
        )
        .reduce((sum, p) => sum + Number(p.montant || 0), 0)

      const contributionPaid = studentPaiements
        .filter(
          (p) =>
            p.type_paiement === 'contribution' ||
            p.type_paiement === 'contribution_arrieree'
        )
        .reduce((sum, p) => sum + Number(p.montant || 0), 0)

      const inscriptionExpected = student.est_en_couple ? 5000 : 10000
      const contributionParBloc = student.est_en_couple ? 2500 : 5000

      const presentCount = studentPresences.filter(
        (p) => p.statut === 'present'
      ).length

      const contributionExpected =
        Math.floor(presentCount / 4) * contributionParBloc

      const absent = studentPresences.some((p) => p.statut === 'absent')

      statsMap[student.id] = {
        inscriptionNonSoldee: inscriptionPaid < inscriptionExpected,
        contributionNonSoldee: contributionPaid < contributionExpected,
        absent,
      }
    })

    setStudentSmsStats(statsMap)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleDateTextChange(e) {
    let value = e.target.value.replace(/\D/g, '')

    if (value.length > 8) value = value.slice(0, 8)

    let formatted = value

    if (value.length >= 3 && value.length <= 4) {
      formatted = `${value.slice(0, 2)}-${value.slice(2)}`
    } else if (value.length >= 5) {
      formatted = `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`
    }

    let isoDate = ''

    if (value.length === 8) {
      const day = value.slice(0, 2)
      const month = value.slice(2, 4)
      const year = value.slice(4, 8)
      isoDate = `${year}-${month}-${day}`
    }

    setForm((prev) => ({
      ...prev,
      date_naissance_text: formatted,
      date_naissance: isoDate,
    }))
  }

  function generateMatricule() {
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase()
    return 'CAE-' + randomPart
  }

  function formatPhoneForLink(phone) {
    if (!phone) return ''
    return String(phone).replace(/[^\d+]/g, '')
  }

  function formatPhoneForSms(phone) {
    if (!phone) return ''
    return String(phone).replace(/[^\d+]/g, '').trim()
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

  function getAnneeLabel(annee) {
    const n = Number(annee)
    if (n === 1) return '1ère année'
    return `${n}ème année`
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

  function openMenu(studentId, event) {
    const rect = event.currentTarget.getBoundingClientRect()

    const dropdownWidth = 220
    const dropdownHeight = 320

    let left = rect.right - dropdownWidth
    if (left < 12) left = 12

    let top = rect.bottom + 8

    const spaceBelow = window.innerHeight - rect.bottom
    if (spaceBelow < dropdownHeight) {
      top = rect.top - dropdownHeight - 8
    }

    if (top < 12) top = 12

    setMenuPosition({ top, left })
    setOpenMenuId(openMenuId === studentId ? null : studentId)
  }

  function toggleCertificat(student) {
    if (!isAdmin) {
      setMessage("Seul l'administrateur peut valider le certificat")
      return
    }

    if (student.certificat_recu) {
      removeCertificat(student.id)
      return
    }

    setCertificatStudentId(student.id)
    setCertificatDate(
      student.date_reception_certificat || new Date().toISOString().slice(0, 10)
    )
    setOpenMenuId(null)
    setMessage('Choisis la date de réception du certificat')

    setTimeout(() => {
      certificatBoxRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 150)
  }

  function updateSmsMessage(type, filter) {
    if (type === 'generale') {
      setSmsMessage('')
      return
    }

    if (filter === 'inscription') {
      setSmsMessage(defaultSmsMessages.inscription)
      return
    }

    if (filter === 'contribution') {
      setSmsMessage(defaultSmsMessages.contribution)
      return
    }

    if (filter === 'absence') {
      setSmsMessage(defaultSmsMessages.absence)
      return
    }

    setSmsMessage(`Soyez bénis au Nom de PAPA JESUS-CHRIST,\n\n`)
  }

  function handleSmsFilterChange(e) {
    const value = e.target.value
    setSmsFilter(value)
    setSelectedStudentIds([])
    updateSmsMessage(smsType, value)
  }

  function handleSmsTypeChange(e) {
    const value = e.target.value
    setSmsType(value)
    updateSmsMessage(value, smsFilter)
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId)
      }
      return [...prev, studentId]
    })
  }

  function selectAllFilteredStudents(list) {
    const ids = [...new Set(list.map((student) => student.id))]
    setSelectedStudentIds(ids)
  }

  function clearStudentSelection() {
    setSelectedStudentIds([])
  }

  function getUniquePhonesFromStudents(list) {
    const seen = new Set()

    return list
      .map((student) => formatPhoneForSms(student.telephone))
      .filter((phone) => {
        if (!phone) return false
        if (seen.has(phone)) return false
        seen.add(phone)
        return true
      })
  }

  function chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  function openSmsAppForBatch(phoneBatch, messageText) {
    if (!phoneBatch.length) {
      setMessage('Aucun numéro valide dans ce lot')
      return
    }

    const recipients = phoneBatch.join(',')
    const encodedMessage = encodeURIComponent(messageText || '')
    window.location.href = `sms:${recipients}?body=${encodedMessage}`
  }

  function selectNextUnsentBatch(list) {
    const remainingStudents = list.filter(
      (student) =>
        !sentStudentIds.includes(student.id) &&
        formatPhoneForSms(student.telephone)
    )

    const nextBatch = remainingStudents.slice(0, Number(smsBatchSize || 25))
    setSelectedStudentIds(nextBatch.map((student) => student.id))
  }

  function sendSmsToSelectedStudents(list) {
    if (!smsMessage.trim()) {
      setMessage('Écris ou vérifie le message SMS')
      return
    }

    const selectedStudents = list.filter((student) =>
      selectedStudentIds.includes(student.id)
    )

    if (selectedStudents.length === 0) {
      setMessage('Sélectionne au moins un étudiant')
      return
    }

    const uniquePhones = getUniquePhonesFromStudents(selectedStudents)

    if (uniquePhones.length === 0) {
      setMessage('Aucun numéro valide pour ce lot')
      return
    }

    const lots = chunkArray(uniquePhones, Number(smsBatchSize || 25))
    const treatedIds = selectedStudents.map((student) => student.id)

    setSentStudentIds((prev) => [...new Set([...prev, ...treatedIds])])

    openSmsAppForBatch(lots[0], smsMessage)

    if (lots.length > 1) {
      setMessage(`Lot 1/${lots.length} ouvert dans l'application SMS.`)
    } else {
      setMessage(
        `${uniquePhones.length} numéro(s) prêt(s) dans l'application SMS.`
      )
    }
  }

  async function confirmCertificat() {
    if (!certificatStudentId || !certificatDate) {
      setMessage('Choisis la date de réception du certificat')
      return
    }

    const { error } = await supabase
      .from('students')
      .update({
        certificat_recu: true,
        date_reception_certificat: certificatDate,
      })
      .eq('id', certificatStudentId)

    if (error) {
      console.log(error)
      setMessage('Erreur mise à jour certificat')
      return
    }

    setCertificatStudentId(null)
    setCertificatDate('')
    setMessage('Certificat validé')
    getStudents()
  }

  async function removeCertificat(studentId) {
    const ok = window.confirm('Retirer la validation du certificat ?')
    if (!ok) return

    const { error } = await supabase
      .from('students')
      .update({
        certificat_recu: false,
        date_reception_certificat: null,
      })
      .eq('id', studentId)

    if (error) {
      console.log(error)
      setMessage('Erreur mise à jour certificat')
      return
    }

    setCertificatStudentId(null)
    setCertificatDate('')
    setOpenMenuId(null)
    setMessage('Validation certificat retirée')
    getStudents()
  }

  async function saveStudent(e) {
    e.preventDefault()
    setMessage('')

    const telephoneNettoye = (form.telephone || '').trim()
    const telephoneSecondaireNettoye = (form.telephone_secondaire || '').trim()
    const emailNettoye = (form.email || '').trim().toLowerCase()

    const duplicate = students.find((s) => {
      if (editingId && String(s.id) === String(editingId)) return false

      const sameTelephone =
        telephoneNettoye && (s.telephone || '').trim() === telephoneNettoye

      const sameTelephoneSecondaire =
        telephoneSecondaireNettoye &&
        (
          (s.telephone_secondaire || '').trim() === telephoneSecondaireNettoye ||
          (s.telephone || '').trim() === telephoneSecondaireNettoye
        )

      const sameTelephoneCroise =
        telephoneNettoye &&
        (s.telephone_secondaire || '').trim() === telephoneNettoye

      const sameEmail =
        emailNettoye &&
        (s.email || '').trim().toLowerCase() === emailNettoye

      return (
        sameTelephone ||
        sameTelephoneSecondaire ||
        sameTelephoneCroise ||
        sameEmail
      )
    })

    if (duplicate) {
      if (
        telephoneNettoye &&
        (
          (duplicate.telephone || '').trim() === telephoneNettoye ||
          (duplicate.telephone_secondaire || '').trim() === telephoneNettoye
        )
      ) {
        setMessage('Ce numéro de téléphone existe déjà')
        return
      }

      if (
        telephoneSecondaireNettoye &&
        (
          (duplicate.telephone || '').trim() === telephoneSecondaireNettoye ||
          (duplicate.telephone_secondaire || '').trim() === telephoneSecondaireNettoye
        )
      ) {
        setMessage('Ce numéro téléphonique secondaire existe déjà')
        return
      }

      if (
        emailNettoye &&
        (duplicate.email || '').trim().toLowerCase() === emailNettoye
      ) {
        setMessage('Cet email existe déjà')
        return
      }
    }

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

    let transfertData = {}

    if (editingId) {
      const currentStudent = students.find(
        (s) => String(s.id) === String(editingId)
      )

      const newClassId = String(finalClassId || '')
      const oldClassId = String(currentStudent?.class_id || '')

      const centreChanged =
        currentStudent &&
        oldClassId &&
        newClassId &&
        oldClassId !== newClassId

      if (centreChanged) {
        const validatedCourses = await getValidatedCoursesBeforeTransfer(
          currentStudent.id,
          currentStudent.class_id
        )

        transfertData = {
          ancien_class_id: currentStudent.class_id,
          seances_validees_avant_transfert: validatedCourses,
          date_transfert: new Date().toISOString().slice(0, 10),
          est_transfere: true,
        }
      }
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
      ...transfertData,
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
      console.log('Erreur Supabase saveStudent:', error)
      setMessage(
        editingId
          ? `Erreur modification étudiant : ${error.message || 'inconnue'}`
          : `Erreur ajout étudiant : ${error.message || 'inconnue'}`
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
      telephone: student.telephone || '',
      telephone_secondaire: student.telephone_secondaire || '',
      email: student.email || '',
      date_naissance: student.date_naissance || '',
      date_naissance_text: student.date_naissance
        ? `${student.date_naissance.slice(8, 10)}-${student.date_naissance.slice(5, 7)}-${student.date_naissance.slice(0, 4)}`
        : '',
      lieu_naissance: student.lieu_naissance || '',
      date_ajout_etudiant: student.date_ajout_etudiant || '',
    })

    setMessage('')
    setOpenMenuId(null)
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
    setOpenMenuId(null)
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

    const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
    const matricule = (student.matricule || '').toLowerCase()
    const telephone = (student.telephone || '').toLowerCase()
    const email = (student.email || '').toLowerCase()

    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      matricule.includes(query) ||
      telephone.includes(query) ||
      email.includes(query)

    if (!matchesSearch) return false

    if (!showSmsPanel) return true

    const stats = studentSmsStats[student.id] || {
      inscriptionNonSoldee: false,
      contributionNonSoldee: false,
      absent: false,
    }

    if (smsFilter === 'tous') return true
    if (smsFilter === 'inscription') return stats.inscriptionNonSoldee
    if (smsFilter === 'contribution') return stats.contributionNonSoldee
    if (smsFilter === 'absence') return stats.absent

    return true
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
      {openMenuId && (
        <div style={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
      )}

      {openMenuId && (
        <div
          style={{
            ...styles.dropdown,
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {(() => {
            const s = students.find((item) => item.id === openMenuId)
            if (!s) return null

            return (
              <>
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
                  style={{ ...styles.dropdownItem, color: '#d91e18' }}
                  onClick={() => deleteStudent(s.id)}
                >
                  Supprimer
                </button>
              </>
            )
          })()}
        </div>
      )}

      <div
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
                  {c.nom} - {getAnneeLabel(c.annee)}
                </option>
              ))}
            </select>
          ) : (
            <div style={styles.infoBox}>Centre : {classes[0]?.nom || '-'}</div>
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
            placeholder="Numéro principal"
            value={form.telephone}
            onChange={handleChange}
          />

          <input
            style={styles.input}
            name="telephone_secondaire"
            placeholder="Numéro secondaire (optionnel)"
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
            placeholder="Date de naissance (ex: 10-04-2000)"
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

        {isAdmin && (
          <button
            type="button"
            style={styles.addButton}
            onClick={() => setShowSmsPanel((prev) => !prev)}
          >
            {showSmsPanel ? 'Fermer message' : 'Message'}
          </button>
        )}



        {isAdmin && certificatStudentId && (
          <div ref={certificatBoxRef} style={styles.certificatBox}>
            <p style={styles.certificatTitle}>
              Date de réception du certificat
            </p>

            <input
              style={styles.input}
              type="date"
              value={certificatDate}
              onChange={(e) => setCertificatDate(e.target.value)}
            />

            <button
              type="button"
              style={styles.addButton}
              onClick={confirmCertificat}
            >
              Confirmer certificat
            </button>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                setCertificatStudentId(null)
                setCertificatDate('')
                setMessage('')
              }}
            >
              Annuler
            </button>
          </div>
        )}

        {isAdmin && showSmsPanel && (
          <div style={styles.smsBox}>
            <h4 style={styles.smsTitle}>SMS étudiants</h4>

            <select
              style={styles.input}
              value={smsFilter}
              onChange={handleSmsFilterChange}
            >
              <option value="tous">Tous</option>
              <option value="inscription">Inscription non soldé</option>
              <option value="contribution">Contribution non soldé</option>
              <option value="absence">Absence</option>
            </select>

            <select
              style={styles.input}
              value={smsType}
              onChange={handleSmsTypeChange}
            >
              <option value="rapide">Information rapide</option>
              <option value="generale">Information générale</option>
            </select>

            <select
              style={styles.input}
              value={smsBatchSize}
              onChange={(e) => setSmsBatchSize(Number(e.target.value))}
            >
              <option value={25}>Lot de 25</option>
              <option value={50}>Lot de 50</option>
              <option value={100}>Lot de 100</option>
              <option value={150}>Lot de 150</option>
              <option value={200}>Lot de 200</option>
            </select>

            <textarea
              style={styles.textarea}
              placeholder="Message SMS"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
            />

            <div style={styles.smsActionRow}>
              <button
                type="button"
                style={styles.secondaryButtonHalf}
                onClick={() => selectAllFilteredStudents(filteredStudents)}
              >
                Sélectionner tout
              </button>

              <button
                type="button"
                style={styles.secondaryButtonHalf}
                onClick={clearStudentSelection}
              >
                Désélectionner tout
              </button>
            </div>

            <div style={styles.smsActionRow}>
              <button
                type="button"
                style={styles.secondaryButtonHalf}
                onClick={() => selectNextUnsentBatch(filteredStudents)}
              >
                Suivant
              </button>

              <button
                type="button"
                style={styles.secondaryButtonHalf}
                onClick={() => {
                  setSentStudentIds([])
                  setSelectedStudentIds([])
                  setMessage('Sélection des lots réinitialisée')
                }}
              >
                Réinitialiser
              </button>
            </div>

            <button
              type="button"
              style={styles.addButton}
              onClick={() => sendSmsToSelectedStudents(filteredStudents)}
            >
              Envoyer SMS
            </button>
          </div>
        )}



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



                {isAdmin && showSmsPanel && (
                  <div style={styles.selectionRow}>
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudentSelection(s.id)}
                    />
                  </div>
                )}

                <div style={styles.nameRow}>
                  <strong style={styles.studentName}>
                    {s.nom} {s.prenom}
                  </strong>

                  {s.certificat_recu && (
                    <span style={styles.certBadge}>Certificat reçu</span>
                  )}
                </div>

                <button
                  type="button"
                  style={styles.menuButton}
                  onClick={(e) => openMenu(s.id, e)}
                >
                  ⋮
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
    position: 'relative',
  },

  menuOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'transparent',
    zIndex: 9998,
  },

  card: {
    background: '#fff',
    border: '2px solid #e3d8f5',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 10px 24px rgba(43, 10, 120, 0.08)',
    position: 'relative',
    overflow: 'visible',
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

  textarea: {
    width: '100%',
    minHeight: 120,
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    resize: 'vertical',
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

  certificatBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    border: '2px solid #eadcf9',
    background: '#fbf8ff',
  },

  certificatTitle: {
    marginTop: 0,
    marginBottom: 10,
    color: '#2b0a78',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  smsBox: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    border: '2px solid #eadcf9',
    background: '#fbf8ff',
  },

  smsTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: '#2b0a78',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 20,
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

  secondaryButtonHalf: {
    flex: 1,
    minWidth: 140,
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

  selectionRow: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 4,
  },

  smsActionRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
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
    position: 'fixed',
    minWidth: 220,
    background: '#fff',
    border: '2px solid #eadcf9',
    borderRadius: 14,
    boxShadow: '0 10px 22px rgba(43, 10, 120, 0.14)',
    overflow: 'hidden',
    zIndex: 9999,
  },

  dropdownItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: 16,
    border: 'none',
    background: '#fff',
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 16,
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
