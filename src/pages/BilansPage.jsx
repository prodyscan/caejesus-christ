import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const INSCRIPTION_MONTANT = 10000
const CONTRIBUTION_PAR_BLOC = 5000
const SEANCES_PAR_BLOC = 4

export default function BilansPage({ profile }) {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [seances, setSeances] = useState([])
  const [presences, setPresences] = useState([])
  const [paiements, setPaiements] = useState([])
  const [filterYear, setFilterYear] = useState('all')
  const [filterPays, setFilterPays] = useState('all')
  const [filterVille, setFilterVille] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [searchStudentBilan, setSearchStudentBilan] = useState('')
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    loadBilans()
  }, [profile])

  async function loadBilans() {
    setMessage('')

    const [studentsRes, classesRes, seancesRes, presencesRes, paiementsRes] =
      await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('seances').select('*'),
        supabase.from('presences').select('*'),
        supabase.from('paiements').select('*'),
      ])

    if (
      studentsRes.error ||
      classesRes.error ||
      seancesRes.error ||
      presencesRes.error ||
      paiementsRes.error
    ) {
      console.log(
        studentsRes.error,
        classesRes.error,
        seancesRes.error,
        presencesRes.error,
        paiementsRes.error
      )
      setMessage('Erreur chargement bilans')
      return
    }

    setStudents(studentsRes.data || [])
    setClasses(classesRes.data || [])
    setSeances(seancesRes.data || [])
    setPresences(presencesRes.data || [])
    setPaiements(paiementsRes.data || [])
  }

  const availablePays = useMemo(() => {
    const values = classes
      .map((c) => (c.pays || '').trim())
      .filter(Boolean)

    return [...new Set(values)].sort((a, b) => a.localeCompare(b))
  }, [classes])

  const availableVilles = useMemo(() => {
    let filtered = classes

    if (filterPays !== 'all') {
      filtered = filtered.filter((c) => (c.pays || '').trim() === filterPays)
    }

    const values = filtered
      .map((c) => (c.ville || '').trim())
      .filter(Boolean)

    return [...new Set(values)].sort((a, b) => a.localeCompare(b))
  }, [classes, filterPays])

  const filteredClassIds = useMemo(() => {
    if (!isAdmin) {
      return assistantClassId ? [assistantClassId] : []
    }

    let filtered = classes

    if (filterYear !== 'all') {
      filtered = filtered.filter((c) => Number(c.annee) === Number(filterYear))
    }

    if (filterPays !== 'all') {
      filtered = filtered.filter((c) => (c.pays || '').trim() === filterPays)
    }

    if (filterVille !== 'all') {
      filtered = filtered.filter((c) => (c.ville || '').trim() === filterVille)
    }

    return filtered.map((c) => c.id)
  }, [classes, filterYear, filterPays, filterVille, isAdmin, assistantClassId])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => filteredClassIds.includes(s.class_id))
  }, [students, filteredClassIds])

  const filteredSeances = useMemo(() => {
    return seances.filter((s) => filteredClassIds.includes(s.class_id))
  }, [seances, filteredClassIds])

  const filteredSeanceIds = useMemo(() => {
    return filteredSeances.map((s) => s.id)
  }, [filteredSeances])

  const filteredStudentIds = useMemo(() => {
    return filteredStudents.map((s) => s.id)
  }, [filteredStudents])

  const filteredPresences = useMemo(() => {
    return presences.filter(
      (p) =>
        filteredSeanceIds.includes(p.seance_id) &&
        filteredStudentIds.includes(p.student_id)
    )
  }, [presences, filteredSeanceIds, filteredStudentIds])

  const filteredPaiements = useMemo(() => {
    return paiements.filter((p) => filteredStudentIds.includes(p.student_id))
  }, [paiements, filteredStudentIds])

  function countCoursesInSeance(chapitreText) {
    if (!chapitreText) return 0

    return String(chapitreText)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
  }

  function isCouple(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)
    return !!student?.couple_record_id
  }

  function getCoupleSize(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)

    if (!student?.couple_record_id) return 1

    const partners = filteredStudents.filter(
      (s) => s.couple_record_id === student.couple_record_id
    )

    return partners.length > 0 ? partners.length : 1
  }

  function getLinkedStudentIds(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)

    if (!student) return [studentId]
    if (!student.couple_record_id) return [studentId]

    return filteredStudents
      .filter((s) => s.couple_record_id === student.couple_record_id)
      .map((s) => s.id)
  }

  function getStudentContributionPaidTotal(studentId) {
    const linkedIds = getLinkedStudentIds(studentId)

    return filteredPaiements
      .filter(
        (p) =>
          linkedIds.includes(p.student_id) &&
          p.type_paiement === 'contribution'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getStudentInscriptionPaidTotal(studentId) {
    const linkedIds = getLinkedStudentIds(studentId)

    return filteredPaiements
      .filter(
        (p) =>
          linkedIds.includes(p.student_id) &&
          p.type_paiement === 'inscription'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
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

  function getMaxContribution(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)
    if (!student) return 0

    const classe = classes.find((c) => c.id === student.class_id)
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

  function getMaxPresenceByYear(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)
    if (!student) return 0

    const classe = classes.find((c) => c.id === student.class_id)
    if (!classe) return 0

    const MAX_BY_YEAR = {
      1: 11 * 4,
      2: 9 * 4,
      3: 7 * 4,
    }

    return MAX_BY_YEAR[Number(classe.annee)] || 0
  }

  function getStudentPresentCount(studentId) {
    return filteredPresences
      .filter((p) => p.student_id === studentId && p.statut === 'present')
      .reduce((sum, presence) => {
        const seance = filteredSeances.find((s) => s.id === presence.seance_id)
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

  function getStudentAbsentCount(studentId) {
    return filteredPresences.filter(
      (p) => p.student_id === studentId && p.statut === 'absent'
    ).length
  }

  function getStudentAttendanceRate(studentId) {
    const student = filteredStudents.find((s) => s.id === studentId)
    if (!student) return 0

    const totalClassCourses = filteredSeances
      .filter((s) => s.class_id === student.class_id)
      .reduce((sum, seance) => sum + countCoursesInSeance(seance.chapitre), 0)

    if (totalClassCourses === 0) return 0

    const presents = getStudentPresentCount(studentId)
    return Math.round((presents / totalClassCourses) * 100)
  }

  function hasInscription(student) {
    return (
      getStudentInscriptionPaid(student.id) >=
      getStudentInscriptionExpected(student.id)
    )
  }

  function hasContribution(student) {
    return getStudentContributionPaid(student.id) >= getMaxContribution(student.id)
  }

  function hasPresence(student) {
    return getStudentPresentCount(student.id) >= getMaxPresenceByYear(student.id)
  }

  function isFullyUpToDate(student) {
    return (
      hasInscription(student) &&
      hasContribution(student) &&
      hasPresence(student)
    )
  }

  function getStudentFinanceStatus(studentId) {
    const inscriptionPaid = getStudentInscriptionPaid(studentId)
    const contributionPaid = getStudentContributionPaid(studentId)
    const inscriptionExpected = getStudentInscriptionExpected(studentId)
    const contributionMax = getMaxContribution(studentId)

    const inscriptionSolded = inscriptionPaid >= inscriptionExpected
    const contributionSolded = contributionPaid >= contributionMax

    if (inscriptionSolded && contributionSolded) return 'Soldé'
    if (inscriptionPaid > 0 || contributionPaid > 0) return 'Partiel'
    return 'En retard'
  }

  function getTotalStudents() {
    return filteredStudents.length
  }

  function getTotalCentres() {
    return filteredClassIds.length
  }

  function getTotalHommes() {
    return filteredStudents.filter(
      (student) => (student.sexe || '').toLowerCase() === 'homme'
    ).length
  }

  function getTotalFemmes() {
    return filteredStudents.filter(
      (student) => (student.sexe || '').toLowerCase() === 'femme'
    ).length
  }

  function getTotalInscriptions() {
    return filteredPaiements
      .filter((p) => p.type_paiement === 'inscription')
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getTotalContributions() {
    return filteredPaiements
      .filter((p) => p.type_paiement === 'contribution')
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getTotalGeneral() {
    return getTotalInscriptions() + getTotalContributions()
  }

  const displayedStudents = useMemo(() => {
    if (filterType === 'all') return filteredStudents

    if (filterType === 'inscription') {
      return filteredStudents.filter((student) => hasInscription(student))
    }

    if (filterType === 'contribution') {
      return filteredStudents.filter((student) => hasContribution(student))
    }

    if (filterType === 'presence') {
      return filteredStudents.filter((student) => hasPresence(student))
    }

    if (filterType === 'complete') {
      return filteredStudents.filter((student) => isFullyUpToDate(student))
    }

    return filteredStudents
  }, [filteredStudents, filterType, filteredPaiements, filteredPresences, filteredSeances])

  const displayedStudentsFiltered = useMemo(() => {
    const query = searchStudentBilan.trim().toLowerCase()

    if (!query) return displayedStudents

    return displayedStudents.filter((student) => {
      const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
      const classeNom =
        (classes.find((c) => c.id === student.class_id)?.nom || '').toLowerCase()

      return fullName.includes(query) || classeNom.includes(query)
    })
  }, [displayedStudents, searchStudentBilan, classes])

  function getTitleByFilter() {
    if (filterType === 'inscription') return 'Étudiants soldés en inscription'
    if (filterType === 'contribution') return 'Étudiants soldés en contribution'
    if (filterType === 'presence') return 'Étudiants présents sur tout le parcours'
    if (filterType === 'complete') return 'Étudiants totalement soldés et présents'
    return 'Tous les étudiants'
  }

  function getAssistantCentreLabel() {
    if (isAdmin) return null
    const assistantCentre = classes.find((c) => c.id === assistantClassId)
    if (!assistantCentre) return 'Mon centre'
    return `${assistantCentre.nom} - ${assistantCentre.annee}ère année`
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Bilans</h2>

        {isAdmin ? (
          <>
            <label style={styles.label}>Année</label>
            <select
              style={styles.select}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">Tout</option>
              <option value="1">1ère année</option>
              <option value="2">2ème année</option>
              <option value="3">3ème année</option>
            </select>

            <label style={styles.label}>Pays</label>
            <select
              style={styles.select}
              value={filterPays}
              onChange={(e) => {
                setFilterPays(e.target.value)
                setFilterVille('all')
              }}
            >
              <option value="all">Tous</option>
              {availablePays.map((pays) => (
                <option key={pays} value={pays}>
                  {pays}
                </option>
              ))}
            </select>

            <label style={styles.label}>Ville</label>
            <select
              style={styles.select}
              value={filterVille}
              onChange={(e) => setFilterVille(e.target.value)}
            >
              <option value="all">Toutes</option>
              {availableVilles.map((ville) => (
                <option key={ville} value={ville}>
                  {ville}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div style={styles.infoBox}>
            Centre : {getAssistantCentreLabel()}
          </div>
        )}

        <label style={styles.label}>Filtre</label>
        <select
          style={styles.select}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Tous</option>
          <option value="inscription">Inscription</option>
          <option value="contribution">Contribution</option>
          <option value="presence">Présence</option>
          <option value="complete">Contribution + inscription + présence</option>
        </select>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          {isAdmin ? 'Résumé général' : 'Résumé de mon centre'}
        </h3>

        <div style={styles.grid}>
          <div style={styles.box}>
            <strong>{getTotalStudents()}</strong>
            <span>Étudiants</span>
          </div>

          <div style={styles.box}>
            <strong>{getTotalCentres()}</strong>
            <span>Centres</span>
          </div>

          <div style={styles.box}>
            <strong>{getTotalHommes()}</strong>
            <span>Hommes</span>
          </div>

          <div style={styles.box}>
            <strong>{getTotalFemmes()}</strong>
            <span>Femmes</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Bilan financier</h3>

        <div style={styles.financialGrid}>
          <div style={styles.financialBox}>
            <strong>{getTotalInscriptions()}</strong>
            <span>Inscriptions</span>
          </div>

          <div style={styles.financialBox}>
            <strong>{getTotalContributions()}</strong>
            <span>Contributions</span>
          </div>

          <div style={styles.financialBox}>
            <strong>{getTotalGeneral()}</strong>
            <span>Total général</span>
          </div>
        </div>

        <p style={styles.fcfaNote}>Montants en FCFA</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{getTitleByFilter()}</h3>

        <input
          style={styles.select}
          placeholder="Rechercher un étudiant ou un centre..."
          value={searchStudentBilan}
          onChange={(e) => setSearchStudentBilan(e.target.value)}
        />

        {displayedStudentsFiltered.length === 0 ? (
          <p>Aucun étudiant trouvé.</p>
        ) : (
          displayedStudentsFiltered.map((student) => (
            <div key={student.id} style={styles.studentCard}>
              <strong style={styles.studentName}>
                {student.nom} {student.prenom}
              </strong>

              <p style={styles.meta}>
                Centre : {classes.find((c) => c.id === student.class_id)?.nom || '-'}
              </p>

              <p style={styles.meta}>
                Année : {classes.find((c) => c.id === student.class_id)?.annee || '-'}
              </p>

              <p style={styles.meta}>
                Présences : {getStudentPresentCount(student.id)}
              </p>

              <p style={styles.meta}>
                Présence attendue : {getMaxPresenceByYear(student.id)}
              </p>

              <p style={styles.meta}>
                Absents : {getStudentAbsentCount(student.id)}
              </p>

              <p style={styles.meta}>
                Taux de présence : {getStudentAttendanceRate(student.id)}%
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
                Contribution attendue actuelle : {getStudentContributionExpected(student.id)} FCFA
              </p>

              <p style={styles.meta}>
                Contribution à solder : {getMaxContribution(student.id)} FCFA
              </p>

              <p style={styles.meta}>
                Contribution payée : {getStudentContributionPaid(student.id)} FCFA
              </p>

              <p style={styles.meta}>
                Reste contribution actuelle : {getStudentContributionRemaining(student.id)} FCFA
              </p>

              <p style={styles.meta}>
                Avance contribution actuelle : {getStudentContributionAdvance(student.id)} FCFA
              </p>

              <p style={styles.meta}>
                Statut financier : {getStudentFinanceStatus(student.id)}
              </p>

              <p style={styles.meta}>
                Statut complet : {isFullyUpToDate(student) ? 'Complet' : 'Pas complet'}
              </p>
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
  label: {
    display: 'block',
    marginBottom: 8,
    marginTop: 12,
    fontWeight: 'bold',
    color: '#2b0a78',
  },
  select: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
  },
  infoBox: {
    width: '100%',
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #eadcf9',
    background: '#fff7fc',
    color: '#2b0a78',
    fontWeight: 'bold',
    boxSizing: 'border-box',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    width: '100%',
  },
  financialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 10,
    width: '100%',
  },
  box: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'center',
    color: '#2b0a78',
    minWidth: 0,
    wordBreak: 'break-word',
    boxSizing: 'border-box',
  },
  financialBox: {
    background: '#fff7fc',
    border: '1px solid #f0cde5',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'center',
    color: '#d4148e',
    fontWeight: 'bold',
    minWidth: 0,
    wordBreak: 'break-word',
    boxSizing: 'border-box',
  },
  studentCard: {
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
  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
  },
  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
  fcfaNote: {
    textAlign: 'center',
    marginTop: 12,
    color: '#6f5b84',
    fontStyle: 'italic',
  },
}
