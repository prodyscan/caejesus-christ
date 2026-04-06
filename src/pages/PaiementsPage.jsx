import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const INSCRIPTION_MONTANT = 10000
const CONTRIBUTION_PAR_BLOC = 5000
const SEANCES_PAR_BLOC = 4

const emptyForm = {
  student_id: '',
  type_paiement: 'inscription',
  montant: '',
  nombre_mois: '',
  date_paiement: '',
  observation: '',
}

export default function PaiementsPage({ profile }) {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [paiements, setPaiements] = useState([])
  const [presences, setPresences] = useState([])
  const [seances, setSeances] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showEtatEtudiants, setShowEtatEtudiants] = useState(false)
  const [periode, setPeriode] = useState('tout')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [message, setMessage] = useState('')
  const [searchStudent, setSearchStudent] = useState('')
  const [filterClassId, setFilterClassId] = useState('all')
  const [searchPaiement, setSearchPaiement] = useState('')
  const [filterTypePaiement, setFilterTypePaiement] = useState('all')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    getClasses()
    getStudents()
    getPaiements()
    getPresences()
    getSeances()
  }, [profile])

  useEffect(() => {
    if (isAdmin) {
      setFilterClassId('all')
    } else {
      setFilterClassId(assistantClassId || 'all')
    }
  }, [isAdmin, assistantClassId])

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

  async function getPresences() {
    const { data, error } = await supabase
      .from('presences')
      .select('*')

    if (error) {
      console.log(error)
      setMessage('Erreur chargement présences')
      return
    }

    setPresences(data || [])
  }

  async function getSeances() {
    let query = supabase.from('seances').select('*')

    if (!isAdmin && assistantClassId) {
      query = query.eq('class_id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement séances')
      return
    }

    setSeances(data || [])
  }

  function parseLocalDate(dateString) {
    if (!dateString) return null

    const parts = String(dateString).split('-')
    if (parts.length !== 3) return null

    const year = Number(parts[0])
    const month = Number(parts[1]) - 1
    const day = Number(parts[2])

    return new Date(year, month, day)
  }


  async function getPaiements() {
    let query = supabase
      .from('paiements')
      .select(`
        *,
        students (
          id,
          nom,
          prenom,
          matricule,
          couple_record_id,
          sexe,
          class_id
        )
      `)
      .order('created_at', { ascending: false })

    if (!isAdmin && assistantClassId) {
      query = query.eq('students.class_id', assistantClassId)
    }

    const { data, error } = await query

    if (error) {
      console.log(error)
      setMessage('Erreur chargement paiements')
      return
    }

    setPaiements(data || [])
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function countCoursesInSeance(chapitreText) {
    if (!chapitreText) return 0

    return String(chapitreText)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
  }

  function getLinkedStudentIds(studentId) {
    const student = students.find((s) => s.id === studentId)

    if (!student) return [studentId]
    if (!student.couple_record_id) return [studentId]

    return students
      .filter((s) => s.couple_record_id === student.couple_record_id)
      .map((s) => s.id)
  }

  function isCouple(studentId) {
    const student = students.find((s) => s.id === studentId)
    return !!student?.couple_record_id
  }

  function getCoupleSize(studentId) {
    const student = students.find((s) => s.id === studentId)

    if (!student?.couple_record_id) return 1

    const partners = students.filter(
      (s) => s.couple_record_id === student.couple_record_id
    )

    return partners.length > 0 ? partners.length : 1
  }

  function getStudentContributionPaidTotal(studentId) {
    const linkedIds = getLinkedStudentIds(studentId)

    return paiements
      .filter(
        (p) =>
          linkedIds.includes(p.student_id) &&
          (
            p.type_paiement === 'contribution' ||
            p.type_paiement === 'contribution_arrieree'
          )
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getStudentInscriptionPaidTotal(studentId) {
    const linkedIds = getLinkedStudentIds(studentId)

    return paiements
      .filter(
        (p) =>
          linkedIds.includes(p.student_id) &&
          (
            p.type_paiement === 'inscription' ||
            p.type_paiement === 'inscription_arrieree'
          )
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getClassOfStudent(studentId) {
    const student = students.find((s) => s.id === studentId)
    if (!student) return null

    return classes.find((c) => c.id === student.class_id) || null
  }

  function getMaxContribution(studentId) {
    const classe = getClassOfStudent(studentId)
    if (!classe) return 0

    const MAX_BY_YEAR = {
      1: 5000 * 11,
      2: 5000 * 9,
      3: 5000 * 7,
    }

    let max = MAX_BY_YEAR[Number(classe.annee)] || 0

    if (isCouple(studentId)) {
      max = max / 2
    }

    return max
  }

  function getStudentContributionPaid(studentId) {
    const total = getStudentContributionPaidTotal(studentId)
    return total / getCoupleSize(studentId)
  }

  function getStudentInscriptionPaid(studentId) {
    const total = getStudentInscriptionPaidTotal(studentId)
    return total / getCoupleSize(studentId)
  }

  function getStudentInscriptionExpected(studentId) {
    return isCouple(studentId) ? INSCRIPTION_MONTANT / 2 : INSCRIPTION_MONTANT
  }

  function getStudentPresentCount(studentId) {
    return presences
      .filter((p) => p.student_id === studentId && p.statut === 'present')
      .reduce((sum, presence) => {
        const seance = seances.find((s) => s.id === presence.seance_id)
        return sum + countCoursesInSeance(seance?.chapitre)
      }, 0)
  }

  function getStudentContributionExpected(studentId) {
    const totalPresents = getStudentPresentCount(studentId)
    const blocs = Math.floor(totalPresents / SEANCES_PAR_BLOC)
    const total = blocs * CONTRIBUTION_PAR_BLOC

    return isCouple(studentId) ? total / 2 : total
  }

  function getStudentContributionRemaining(studentId) {
    const expected = getStudentContributionExpected(studentId)
    const paid = getStudentContributionPaid(studentId)
    return expected > paid ? expected - paid : 0
  }

  function getStudentContributionAdvance(studentId) {
    const expected = getStudentContributionExpected(studentId)
    const paid = getStudentContributionPaid(studentId)
    return paid > expected ? paid - expected : 0
  }

  function getStudentInscriptionRemaining(studentId) {
    const paid = getStudentInscriptionPaid(studentId)
    const expected = getStudentInscriptionExpected(studentId)
    return expected > paid ? expected - paid : 0
  }

  function getStudentFinanceStatus(studentId) {
    const inscriptionPaid = getStudentInscriptionPaid(studentId)
    const contributionPaid = getStudentContributionPaid(studentId)
    const inscriptionExpected = getStudentInscriptionExpected(studentId)
    const contributionExpected = getStudentContributionExpected(studentId)
    const contributionMax = getMaxContribution(studentId)

    const inscriptionOk = inscriptionPaid >= inscriptionExpected
    const contributionOk = contributionPaid >= contributionExpected
    const contributionFullyPaid =
      contributionMax > 0 && contributionPaid >= contributionMax

    if (inscriptionOk && contributionFullyPaid) {
      return 'Soldé'
    }

    if (inscriptionOk && contributionOk && contributionExpected > 0) {
      return 'Soldé'
    }

    if (inscriptionPaid > 0 || contributionPaid > 0) {
      return 'Partiel'
    }

    return 'En retard'
  }

  function getStatusColor(status) {
    if (status === 'En avance') return '#1b8f3a'
    if (status === 'Soldé') return '#b07a00'
    if (status === 'Partiel') return '#1565c0'
    return '#d91e18'
  }

  function getPaiementTypeLabel(type) {
    if (type === 'inscription') return 'Inscription'
    if (type === 'contribution') return 'Contribution'
    if (type === 'inscription_arrieree') return 'Inscription arriérée'
    if (type === 'contribution_arrieree') return 'Contribution arriérée'
    return type || '-'
  }

  async function savePaiement(e) {
    e.preventDefault()
    setMessage('')

    if (!form.student_id) {
      setMessage("Choisis d'abord un étudiant")
      return
    }

    const { data: selectedStudent, error: selectedStudentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', form.student_id)
      .single()

    if (selectedStudentError) {
      console.log(selectedStudentError)
      setMessage("Impossible de vérifier l'étudiant")
      return
    }

    if (
      !isAdmin &&
      assistantClassId &&
      selectedStudent.class_id !== assistantClassId
    ) {
      setMessage('Tu ne peux gérer que les paiements de ton centre')
      return
    }

    if (selectedStudent?.couple_record_id && selectedStudent.sexe === 'femme') {
      setMessage('Le paiement du couple doit être fait côté homme.')
      return
    }

    const montant = Number(form.montant || 0)

    if (!montant || montant <= 0) {
      setMessage('Le montant doit être supérieur à 0')
      return
    }

    if (
      form.type_paiement === 'inscription' ||
      form.type_paiement === 'inscription_arrieree'
    ) {
      const expectedTotal = INSCRIPTION_MONTANT
      const alreadyPaidTotal = getStudentInscriptionPaidTotal(form.student_id)
      const remainingTotal = expectedTotal - alreadyPaidTotal

      if (remainingTotal <= 0) {
        setMessage('Inscription déjà soldée')
        return
      }

      if (montant > remainingTotal) {
        setMessage(`Montant trop élevé. Reste à payer : ${remainingTotal} FCFA`)
        return
      }
    }

    if (
      form.type_paiement === 'contribution' ||
      form.type_paiement === 'contribution_arrieree'
    ) {
      const maxTotal = isCouple(form.student_id)
        ? getMaxContribution(form.student_id) * 2
        : getMaxContribution(form.student_id)

      const alreadyPaidTotal = getStudentContributionPaidTotal(form.student_id)

      if (maxTotal <= 0) {
        setMessage('Impossible de déterminer la limite de contribution')
        return
      }

      if (alreadyPaidTotal + montant > maxTotal) {
        const remainingTotal = maxTotal - alreadyPaidTotal
        setMessage(
          `Limite atteinte. Reste autorisé : ${
            remainingTotal > 0 ? remainingTotal : 0
          } FCFA`
        )
        return
      }
    }

    setLoading(true)

    const payload = {
      student_id: form.student_id,
      type_paiement: form.type_paiement,
      montant,
      nombre_mois:
        form.type_paiement === 'contribution' ||
        form.type_paiement === 'contribution_arrieree'
          ? Number(form.nombre_mois || 0)
          : 0,
      date_paiement:
        form.date_paiement || new Date().toISOString().slice(0, 10),
      observation: form.observation.trim(),
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('paiements')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('paiements')
        .insert([payload])

      error = result.error
    }

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement paiement')
      return
    }

    setMessage(editingId ? 'Paiement modifié' : 'Paiement enregistré')
    setForm(emptyForm)
    setEditingId(null)

    getPaiements()
    getStudents()
    getPresences()
    getSeances()
    getClasses()
  }

  function editPaiement(paiement) {
    setEditingId(paiement.id)
    setForm({
      student_id: paiement.student_id || '',
      type_paiement: paiement.type_paiement || 'inscription',
      montant: paiement.montant ? String(paiement.montant) : '',
      nombre_mois: paiement.nombre_mois ? String(paiement.nombre_mois) : '',
      date_paiement: paiement.date_paiement || '',
      observation: paiement.observation || '',
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  async function deletePaiement(id) {
    const ok = window.confirm('Supprimer ce paiement ?')
    if (!ok) return

    const { error } = await supabase
      .from('paiements')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression paiement')
      return
    }

    setMessage('Paiement supprimé')
    getPaiements()
    getStudents()
    getPresences()
    getSeances()
    getClasses()
  }

  function getStudentLabel(student) {
    return `${student.nom || ''} ${student.prenom || ''}${
      student.matricule ? ' - ' + student.matricule : ''
    }`
  }

  function getPartnerName(student) {
    if (!student?.couple_record_id) return 'Pas en couple'

    const partner = students.find(
      (s) =>
        s.couple_record_id === student.couple_record_id &&
        s.id !== student.id
    )

    if (!partner) return 'Couple enregistré'
    return `${partner.nom || ''} ${partner.prenom || ''}`.trim()
  }

  const filteredStudents = useMemo(() => {
    if (filterClassId === 'all') return students

    return students.filter(
      (student) => String(student.class_id) === String(filterClassId)
    )
  }, [students, filterClassId])

  const filteredStudentsForSelect = useMemo(() => {
    const query = searchStudent.trim().toLowerCase()

    return filteredStudents.filter((student) => {
      if (!query) return true

      const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
      const matricule = (student.matricule || '').toLowerCase()

      return fullName.includes(query) || matricule.includes(query)
    })
  }, [filteredStudents, searchStudent])

  const filteredPaiements = useMemo(() => {
    let result = paiements

    if (filterClassId !== 'all') {
      result = result.filter(
        (paiement) =>
          String(paiement.students?.class_id) === String(filterClassId)
      )
    }

    if (filterTypePaiement !== 'all') {
      result = result.filter(
        (paiement) => paiement.type_paiement === filterTypePaiement
      )
    }

    const query = searchPaiement.trim().toLowerCase()

    if (query) {
      result = result.filter((paiement) => {
        const fullName =
          `${paiement.students?.nom || ''} ${paiement.students?.prenom || ''}`.toLowerCase()

        const matricule = (paiement.students?.matricule || '').toLowerCase()
        const observation = (paiement.observation || '').toLowerCase()
        const typeLabel = getPaiementTypeLabel(paiement.type_paiement).toLowerCase()

        return (
          fullName.includes(query) ||
          matricule.includes(query) ||
          observation.includes(query) ||
          typeLabel.includes(query)
        )
      })
    }

    return result
  }, [paiements, filterClassId, filterTypePaiement, searchPaiement])

  function getFilteredPaiementsByPeriod() {
    const now = new Date()

    return filteredPaiements.filter((p) => {
      const date = parseLocalDate(p.date_paiement)
      if (!date) return false

      if (periode === 'mensuel') {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
      }

      if (periode === 'trimestre') {
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const paymentQuarter = Math.floor(date.getMonth() / 3)

        return (
          paymentQuarter === currentQuarter &&
          date.getFullYear() === now.getFullYear()
        )
      }

      if (periode === 'semestre') {
        const currentSemester = now.getMonth() < 6 ? 1 : 2
        const paymentSemester = date.getMonth() < 6 ? 1 : 2

        return (
          paymentSemester === currentSemester &&
          date.getFullYear() === now.getFullYear()
        )
      }

      if (periode === 'annuel') {
        return date.getFullYear() === now.getFullYear()
      }

      if (periode === 'personnalise') {
        if (!dateDebut || !dateFin) return true

        const start = parseLocalDate(dateDebut)
        const end = parseLocalDate(dateFin)

        if (!start || !end) return true

        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)

        return date >= start && date <= end
      }

      return true
    })
  }

  function getTotalInscriptions() {
    return getFilteredPaiementsByPeriod()
      .filter(
        (p) =>
          p.type_paiement === 'inscription' ||
          p.type_paiement === 'inscription_arrieree'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getTotalContributions() {
    return getFilteredPaiementsByPeriod()
      .filter(
        (p) =>
          p.type_paiement === 'contribution' ||
          p.type_paiement === 'contribution_arrieree'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getTotalGeneral() {
    return getTotalInscriptions() + getTotalContributions()
  }

  const selectedStudentInfo = useMemo(() => {
    return students.find((s) => s.id === form.student_id) || null
  }, [students, form.student_id])

  function getPeriodeLabel() {
    if (periode === 'mensuel') return 'Mensuel'
    if (periode === 'trimestre') return 'Trimestriel'
    if (periode === 'semestre') return 'Semestriel'
    if (periode === 'annuel') return 'Annuel'
    if (periode === 'personnalise') {
      if (dateDebut && dateFin) {
        return `Personnalisée : ${dateDebut} au ${dateFin}`
      }
      return 'Personnalisée'
    }
    return 'Tout'
  }

  return (
    <div style={styles.page}>

      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier paiement' : 'Paiements'}
        </h2>

        <form onSubmit={savePaiement}>
          {isAdmin && (
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
          )}

          <input
            style={styles.input}
            placeholder="Rechercher un étudiant..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
          />

          <select
            style={styles.input}
            name="student_id"
            value={form.student_id}
            onChange={handleChange}
          >
            <option value="">Choisir un étudiant</option>
            {filteredStudentsForSelect.map((student) => (
              <option key={student.id} value={student.id}>
                {getStudentLabel(student)}
              </option>
            ))}
          </select>

          {selectedStudentInfo && (
            <div style={styles.infoPanel}>
              <p style={styles.infoLine}>
                Inscription attendue : {getStudentInscriptionExpected(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Inscription payée : {getStudentInscriptionPaid(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Reste inscription : {getStudentInscriptionRemaining(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Séances suivies : {getStudentPresentCount(selectedStudentInfo.id)}
              </p>
              <p style={styles.infoLine}>
                Contribution attendue : {getStudentContributionExpected(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Contribution payée : {getStudentContributionPaid(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Reste contribution : {getStudentContributionRemaining(selectedStudentInfo.id)} FCFA
              </p>
              <p style={styles.infoLine}>
                Avance contribution : {getStudentContributionAdvance(selectedStudentInfo.id)} FCFA
              </p>
              <p
                style={{
                  ...styles.infoLine,
                  color: getStatusColor(getStudentFinanceStatus(selectedStudentInfo.id)),
                  fontWeight: 'bold',
                }}
              >
                Statut financier : {getStudentFinanceStatus(selectedStudentInfo.id)}
              </p>
            </div>
          )}

          <select
            style={styles.input}
            name="type_paiement"
            value={form.type_paiement}
            onChange={handleChange}
          >
            <option value="inscription">Inscription</option>
            <option value="contribution">Contribution</option>
            <option value="contribution_arrieree">Contribution arriérée</option>
            <option value="inscription_arrieree">Inscription arriérée</option>
          </select>

          <input
            style={styles.input}
            name="montant"
            type="number"
            placeholder="Montant"
            value={form.montant}
            onChange={handleChange}
          />

          {(form.type_paiement === 'contribution' ||
            form.type_paiement === 'contribution_arrieree') && (
            <input
              style={styles.input}
              name="nombre_mois"
              type="number"
              placeholder="Nombre de mois payés (optionnel)"
              value={form.nombre_mois}
              onChange={handleChange}
            />
          )}

          <input
            style={styles.input}
            name="date_paiement"
            type="date"
            value={form.date_paiement}
            onChange={handleChange}
          />

          <textarea
            style={styles.textarea}
            name="observation"
            placeholder="Observation"
            value={form.observation}
            onChange={handleChange}
          />

          <button
            style={styles.primaryButtonFull}
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Enregistrement...'
              : editingId
              ? 'Modifier paiement'
              : 'Enregistrer paiement'}
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
        <h3 style={styles.sectionTitle}>Filtre période</h3>

        <select
          style={styles.input}
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        >
          <option value="tout">Tout</option>
          <option value="mensuel">Mensuel</option>
          <option value="trimestre">Trimestriel</option>
          <option value="semestre">Semestriel</option>
          <option value="annuel">Annuel</option>
          <option value="personnalise">Plage personnalisée</option>
        </select>

        {periode === 'personnalise' && (
          <>
            <input
              style={styles.input}
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />

            <input
              style={styles.input}
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Résumé financier</h3>

        <p style={styles.fcfaNote}>Période : {getPeriodeLabel()}</p>

        <div style={styles.resumeGrid}>
          <div style={styles.resumeBox}>
            <strong>{getTotalInscriptions()}</strong>
            <span>Inscriptions</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getTotalContributions()}</strong>
            <span>Contributions</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getTotalGeneral()}</strong>
            <span>Total général</span>
          </div>
        </div>

        <p style={styles.fcfaNote}>Montants en FCFA</p>
      </div>

      <div style={styles.card}>
        <button
          type="button"
          style={styles.toggleSectionButton}
          onClick={() => setShowEtatEtudiants((prev) => !prev)}
        >
          {showEtatEtudiants ? 'Masquer état des étudiants' : 'Afficher état des étudiants'}
        </button>

        {showEtatEtudiants && (
          <>
            <h3 style={styles.sectionTitle}>État des étudiants</h3>

            {filteredStudents.length === 0 ? (
              <p>Aucun étudiant enregistré.</p>
            ) : (
              filteredStudents.map((student) => {
                const status = getStudentFinanceStatus(student.id)

                return (
                  <div key={student.id} style={styles.itemCard}>
                    <strong style={styles.studentName}>
                      {student.nom} {student.prenom}
                    </strong>

                    <p style={styles.meta}>
                      Couple : {getPartnerName(student)}
                    </p>

                    <p style={styles.meta}>
                      Sexe : {student.sexe || '-'}
                    </p>

                    <p style={styles.meta}>
                      Inscription attendue : {getStudentInscriptionExpected(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Inscription payée : {getStudentInscriptionPaid(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Reste inscription : {getStudentInscriptionRemaining(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Séances suivies : {getStudentPresentCount(student.id)}
                    </p>

                    <p style={styles.meta}>
                      Contribution attendue : {getStudentContributionExpected(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Contribution payée : {getStudentContributionPaid(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Reste contribution : {getStudentContributionRemaining(student.id)} FCFA
                    </p>

                    <p style={styles.meta}>
                      Avance contribution : {getStudentContributionAdvance(student.id)} FCFA
                    </p>

                    <p
                      style={{
                        ...styles.meta,
                        color: getStatusColor(status),
                        fontWeight: 'bold',
                      }}
                    >
                      Statut : {status}
                    </p>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>



      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Liste des paiements</h3>

        <input
          style={styles.input}
          placeholder="Rechercher par nom, prénom, matricule..."
          value={searchPaiement}
          onChange={(e) => setSearchPaiement(e.target.value)}
        />

        <select
          style={styles.input}
          value={filterTypePaiement}
          onChange={(e) => setFilterTypePaiement(e.target.value)}
        >
          <option value="all">Tous les types</option>
          <option value="inscription">Inscription</option>
          <option value="contribution">Contribution</option>
          <option value="inscription_arrieree">Inscription arriérée</option>
          <option value="contribution_arrieree">Contribution arriérée</option>
        </select>

        {filteredPaiements.length === 0 ? (
          <p>Aucun paiement enregistré.</p>
        ) : (
          filteredPaiements.map((paiement) => (
            <div key={paiement.id} style={styles.itemCard}>
              <strong style={styles.studentName}>
                {paiement.students?.nom || '-'} {paiement.students?.prenom || ''}
              </strong>

              <p style={styles.meta}>
                Type : {getPaiementTypeLabel(paiement.type_paiement)}
              </p>

              {(paiement.type_paiement === 'inscription_arrieree' ||
                paiement.type_paiement === 'contribution_arrieree') && (
                <p style={styles.arriereeNote}>
                  Paiement effectué en retard
                </p>
              )}

              <p style={styles.meta}>Montant : {paiement.montant} FCFA</p>
              <p style={styles.meta}>Mois payés : {paiement.nombre_mois || 0}</p>
              <p style={styles.meta}>Date : {paiement.date_paiement || '-'}</p>
              <p style={styles.meta}>Observation : {paiement.observation || '-'}</p>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => editPaiement(paiement)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deletePaiement(paiement.id)}
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
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  card: {
    background: '#ffffff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
    boxSizing: 'border-box',
    overflow: 'hidden',
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
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    resize: 'vertical',
    background: '#fff',
  },
  infoPanel: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  infoLine: {
    margin: '6px 0',
    color: '#555',
    wordBreak: 'break-word',
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  studentName: {
    color: '#2b0a78',
    fontSize: 20,
    wordBreak: 'break-word',
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
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
    minWidth: 120,
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
    minWidth: 120,
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
  },
  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
  resumeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    width: '100%',
  },
  resumeBox: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: '#2b0a78',
    fontWeight: 'bold',
    minWidth: 0,
    wordBreak: 'break-word',
    boxSizing: 'border-box',
  },
  fcfaNote: {
    textAlign: 'center',
    marginTop: 12,
    color: '#6f5b84',
    fontStyle: 'italic',
  },
  arriereeNote: {
    margin: '6px 0',
    padding: '8px 10px',
    borderRadius: 10,
    background: '#fff4e5',
    color: '#b26a00',
    fontWeight: 'bold',
    textAlign: 'center',
    border: '1px solid #f3d19c',
  },
  toggleSectionButton: {
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

}
