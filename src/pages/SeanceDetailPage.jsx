import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SeanceDetailPage({ seanceId, onBack }) {
  const [seance, setSeance] = useState(null)
  const [students, setStudents] = useState([])
  const [presences, setPresences] = useState({})
  const [paiements, setPaiements] = useState([])
  const [search, setSearch] = useState('')
  const [matriculeInput, setMatriculeInput] = useState('')
  const [message, setMessage] = useState('')
  const [pointageMode, setPointageMode] = useState('matricule')
  const [temoignage, setTemoignage] = useState('')
  const [loadingRapport, setLoadingRapport] = useState(false)
  const [editingRapport, setEditingRapport] = useState(true)

  useEffect(() => {
    loadData()
  }, [seanceId])

  async function loadData() {
    setMessage('')

    const { data: seanceData, error: seanceError } = await supabase
      .from('seances')
      .select(`
        *,
        classes (
          id,
          nom,
          annee,
          assistant_nom
        )
      `)
      .eq('id', seanceId)
      .single()

    if (seanceError) {
      console.log(seanceError)
      setMessage('Erreur chargement séance')
      return
    }

    setSeance(seanceData)

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', seanceData.class_id)
      .order('nom', { ascending: true })

    if (studentsError) {
      console.log(studentsError)
      setMessage('Erreur chargement étudiants')
      return
    }

    setStudents(studentsData || [])

    const { data: presencesData, error: presencesError } = await supabase
      .from('presences')
      .select('*')
      .eq('seance_id', seanceId)

    if (presencesError) {
      console.log(presencesError)
      setMessage('Erreur chargement présences')
      return
    }

    const map = {}
    ;(presencesData || []).forEach((item) => {
      map[item.student_id] = item.statut
    })
    setPresences(map)

    const studentIds = (studentsData || []).map((s) => s.id)

    if (studentIds.length > 0) {
      const { data: paiementsData, error: paiementsError } = await supabase
        .from('paiements')
        .select('*')
        .in('student_id', studentIds)
        .eq('date_paiement', seanceData.date_seance)

      if (paiementsError) {
        console.log(paiementsError)
      } else {
        setPaiements(paiementsData || [])
      }
    } else {
      setPaiements([])
    }

    const { data: rapportData, error: rapportError } = await supabase
      .from('rapports_seance')
      .select('*')
      .eq('seance_id', seanceId)
      .maybeSingle()

    if (rapportError) {
      console.log(rapportError)
    } else if (rapportData) {
      setTemoignage(rapportData.temoignage || '')
      setEditingRapport(false)
    } else {
      setTemoignage('')
      setEditingRapport(true)
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
  }

  function findStudentByMatricule(code) {
    const searchCode = normalizeText(code)

    return students.find(
      (student) => normalizeText(student.matricule) === searchCode
    )
  }

  async function markPresence(studentId, statut) {
    setMessage('')

    const { error } = await supabase
      .from('presences')
      .upsert(
        [{ seance_id: seanceId, student_id: studentId, statut }],
        { onConflict: 'seance_id,student_id' }
      )

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement pointage')
      return
    }

    setPresences((prev) => ({
      ...prev,
      [studentId]: statut,
    }))

    setMessage('Pointage enregistré')
  }

  async function markByMatricule(e) {
    e.preventDefault()

    const code = matriculeInput.trim()

    if (!code) {
      setMessage('Entre un matricule')
      return
    }

    const student = findStudentByMatricule(code)

    if (!student) {
      setMessage('Aucun étudiant trouvé avec ce matricule')
      return
    }

    await markPresence(student.id, 'present')
    setMatriculeInput('')
    setMessage(`Présence validée : ${student.nom} ${student.prenom}`)
  }

  async function saveRapport() {
    if (!seance) return

    setLoadingRapport(true)
    setMessage('')

    const payload = {
      seance_id: seanceId,
      class_id: seance.class_id,
      rapport: '',
      temoignage: temoignage.trim(),
      redige_par: seance.classes?.assistant_nom || null,
    }

    const { data: existingReport, error: checkError } = await supabase
      .from('rapports_seance')
      .select('id')
      .eq('seance_id', seanceId)
      .maybeSingle()

    if (checkError) {
      console.log(checkError)
      setLoadingRapport(false)
      setMessage('Erreur vérification rapport')
      return
    }

    let error = null

    if (existingReport?.id) {
      const result = await supabase
        .from('rapports_seance')
        .update(payload)
        .eq('id', existingReport.id)

      error = result.error
    } else {
      const result = await supabase
        .from('rapports_seance')
        .insert([payload])

      error = result.error
    }

    setLoadingRapport(false)

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement témoignages')
      return
    }

    setMessage('Témoignages enregistrés avec succès')
    setEditingRapport(false)
  }

  function formatDateFR(dateValue) {
    if (!dateValue) return '-'

    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return dateValue

    return date.toLocaleDateString('fr-FR')
  }

  function getYearLabel(annee) {
    if (Number(annee) === 1) return '1e année'
    return `${annee}e année`
  }

  function getPresentStudents() {
    return students.filter((student) => presences[student.id] === 'present')
  }

  function getContributionsOfDay() {
    return paiements.filter((p) => p.type_paiement === 'contribution')
  }

  function getInscriptionsOfDay() {
    return paiements.filter((p) => p.type_paiement === 'inscription')
  }
  function getNombreHommes() {
    return students.filter((s) => s.sexe === 'homme').length
  }

  function getNombreFemmes() {
    return students.filter((s) => s.sexe === 'femme').length
  }

  function getHommesPresents() {
    return students.filter(
      (s) => s.sexe === 'homme' && presences[s.id] === 'present'
    ).length
  }

  function getFemmesPresents() {
    return students.filter(
      (s) => s.sexe === 'femme' && presences[s.id] === 'present'
    ).length
  }
  function getStudentFullName(studentId) {
    const student = students.find((s) => s.id === studentId)
    if (!student) return 'Étudiant inconnu'
    return `${student.nom || ''} ${student.prenom || ''}`.trim()
  }

  function buildContributionLines() {
    const grouped = {}

    getContributionsOfDay().forEach((item) => {
      const key = item.student_id
      grouped[key] = (grouped[key] || 0) + Number(item.montant || 0)
    })

    const lines = Object.entries(grouped).map(([studentId, montant]) => {
      return `${getStudentFullName(Number(studentId))} : ${montant} FCFA`
    })

    if (lines.length === 0) {
      return ['Aucune contribution enregistrée']
    }

    return lines
  }

  function getTotalContribution() {
    return getContributionsOfDay().reduce(
      (sum, item) => sum + Number(item.montant || 0),
      0
    )
  }

  function getTotalInscription() {
    return getInscriptionsOfDay().reduce(
      (sum, item) => sum + Number(item.montant || 0),
      0
    )
  }

  function getTotalGeneral() {
    return getTotalInscription() + getTotalContribution()
  }
  function buildShareContent() {
    const presents = getPresentStudents().length
    const totalStudents = students.length
    const contributionLines = buildContributionLines()
    const totalInscription = getTotalInscription()
    const totalGeneral = getTotalGeneral()

    const centreLabel = `${seance?.classes?.nom || '-'} ${getYearLabel(seance?.classes?.annee)}`
    const seanceLine = seance?.chapitre || '-'

    return [
      '*Rapport les Écoles et Universités de la Connaissance de JÉSUS-CHRIST*',
      '',
      `_*Abidjan le ${formatDateFR(seance?.date_seance)}*_`,
      '',
      `*CENTRE*: *${centreLabel}*`,
      '',
      '*Séance :*',
      `${seanceLine}`,
      '',
      `*Effectifs :* ${presents}/${totalStudents}`,
      '',
      `*Inscriptions:* ${totalInscription} FCFA`,
      '',
      '*Contribution:*',
      ...contributionLines,
      '',
      `*Total :* ${totalGeneral} FCFA`,
      '',
      '*Témoignages :*',
      '',
      temoignage?.trim() || 'Aucun témoignage enregistré',
      '',
      '*Nom de l’assistant:*',
      `- ${seance?.classes?.assistant_nom || 'Non renseigné'}`,
    ].join('\n')
  }

  async function copyRapportEtTemoignage() {
    const text = buildShareContent()

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setMessage('Rapport copié')
        return
      }

      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (ok) {
        setMessage('Rapport copié')
      } else {
        setMessage('Copie impossible sur cet appareil')
      }
    } catch (error) {
      console.log(error)
      setMessage('Copie impossible sur cet appareil')
    }
  }

  function shareOnWhatsApp() {
    const text = buildShareContent()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  function getPresentsCount() {
    return Object.values(presences).filter((v) => v === 'present').length
  }

  function getAbsentsCount() {
    return Object.values(presences).filter((v) => v === 'absent').length
  }

  function getNonPointesCount() {
    return students.length - getPresentsCount() - getAbsentsCount()
  }

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase()
    if (!query) return true

    const fullName = `${student.nom || ''} ${student.prenom || ''}`.toLowerCase()
    const matricule = (student.matricule || '').toLowerCase()

    return fullName.includes(query) || matricule.includes(query)
  })

  if (!seance) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <button type="button" style={styles.backButton} onClick={onBack}>
            ← Retour
          </button>
          <p>Chargement...</p>
          {message ? <p style={styles.message}>{message}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <button type="button" style={styles.backButton} onClick={onBack}>
          ← Retour aux séances
        </button>

        <h2 style={styles.title}>Détail séance</h2>

        <div style={styles.infoBox}>
          <p><strong>Séance :</strong> {seance.chapitre || '-'}</p>
          <p><strong>Centre :</strong> {seance.classes?.nom || '-'}</p>
          <p><strong>Année :</strong> {seance.classes?.annee || '-'}</p>
          <p><strong>Date :</strong> {seance.date_seance || '-'}</p>
        </div>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Méthode de pointage</h3>

        <div style={styles.modeSelector}>
          <button
            type="button"
            onClick={() => setPointageMode('matricule')}
            style={pointageMode === 'matricule' ? styles.modeButtonActive : styles.modeButton}
          >
            Matricule
          </button>

          <button
            type="button"
            onClick={() => setPointageMode('manuel')}
            style={pointageMode === 'manuel' ? styles.modeButtonActive : styles.modeButton}
          >
            Manuel
          </button>
        </div>

        {pointageMode === 'matricule' && (
          <div style={styles.innerCard}>
            <h3 style={styles.sectionTitle}>Pointage par matricule</h3>

            <form onSubmit={markByMatricule}>
              <input
                style={styles.input}
                placeholder="Entrer le matricule"
                value={matriculeInput}
                onChange={(e) => setMatriculeInput(e.target.value)}
              />

              <button style={styles.primaryButtonFull} type="submit">
                Valider présence
              </button>
            </form>
          </div>
        )}

        {pointageMode === 'manuel' && (
          <div style={styles.innerCard}>
            <h3 style={styles.sectionTitle}>Pointage manuel</h3>

            <input
              style={styles.input}
              placeholder="Rechercher nom ou matricule..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {filteredStudents.length === 0 ? (
              <p>Aucun étudiant trouvé.</p>
            ) : (
              filteredStudents.map((student) => {
                const statut = presences[student.id] || 'non_pointe'

                return (
                  <div key={student.id} style={styles.studentCard}>
                    <div>
                      <strong style={styles.studentName}>
                        {student.nom} {student.prenom}
                      </strong>

                      <p style={styles.meta}>Matricule : {student.matricule || '-'}</p>
                      <p style={styles.meta}>
                        Statut :{' '}
                        {statut === 'present'
                          ? 'Présent'
                          : statut === 'absent'
                          ? 'Absent'
                          : 'Non pointé'}
                      </p>
                    </div>

                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        style={statut === 'present' ? styles.presentActive : styles.presentButton}
                        onClick={() => markPresence(student.id, 'present')}
                      >
                        Présent
                      </button>

                      <button
                        type="button"
                        style={statut === 'absent' ? styles.absentActive : styles.absentButton}
                        onClick={() => markPresence(student.id, 'absent')}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <div style={styles.resumeGrid}>
        <div style={styles.resumeBox}>
          <strong>{getNombreHommes()}</strong>
          <span>Hommes</span>
        </div>

        <div style={styles.resumeBox}>
          <strong>{getNombreFemmes()}</strong>
          <span>Femmes</span>
        </div>

        <div style={styles.resumeBox}>
          <strong>{getHommesPresents()}</strong>
          <span>Hommes présents</span>
        </div>

        <div style={styles.resumeBox}>
          <strong>{getFemmesPresents()}</strong>
          <span>Femmes présentes</span>
        </div>
      </div>


      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Résumé présence</h3>

        <div style={styles.resumeGrid}>
          <div style={styles.resumeBox}>
            <strong>{students.length}</strong>
            <span>Étudiants</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getPresentsCount()}</strong>
            <span>Présents</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getAbsentsCount()}</strong>
            <span>Absents</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getNonPointesCount()}</strong>
            <span>Non pointés</span>
          </div>
        </div>
      </div>
  <div style={styles.card}>
    <h3 style={styles.sectionTitle}>Résumé financier de la séance</h3>

    <div style={styles.resumeGrid}>
      <div style={styles.resumeBox}>
        <strong>{getTotalInscription()}</strong>
        <span>Inscriptions</span>
      </div>

      <div style={styles.resumeBox}>
        <strong>{getTotalContribution()}</strong>
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
        <h3 style={styles.sectionTitle}>Témoignages</h3>

        {!editingRapport && temoignage ? (
          <>
            <div style={styles.readBox}>
              <h4 style={styles.readTitle}>Témoignages</h4>
              <p style={styles.readText}>{temoignage || 'Aucun témoignage enregistré'}</p>
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.whatsappButton}
                onClick={shareOnWhatsApp}
              >
                Partager sur WhatsApp
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={copyRapportEtTemoignage}
              >
                Copier
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setEditingRapport(true)}
              >
                Modifier
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              style={styles.textarea}
              placeholder="Saisir seulement les témoignages"
              value={temoignage}
              onChange={(e) => setTemoignage(e.target.value)}
            />

            <button
              type="button"
              style={styles.primaryButtonFull}
              onClick={saveRapport}
              disabled={loadingRapport}
            >
              {loadingRapport ? 'Enregistrement...' : 'Enregistrer témoignages'}
            </button>

            {temoignage && (
              <button
                type="button"
                style={styles.secondaryButtonFull}
                onClick={() => setEditingRapport(false)}
              >
                Annuler modification
              </button>
            )}
          </>
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
  innerCard: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    boxSizing: 'border-box',
    overflow: 'hidden',
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
  title: {
    marginTop: 0,
    marginBottom: 12,
    textAlign: 'center',
    color: '#2b0a78',
    fontSize: 34,
    fontWeight: 'bold',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  infoBox: {
    background: 'linear-gradient(180deg, #fff7fc 0%, #f7f1ff 100%)',
    border: '2px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    color: '#5e4d74',
    fontSize: 18,
    lineHeight: 1.7,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
    wordBreak: 'break-word',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: '#6f5b84',
    textAlign: 'center',
    fontSize: 24,
  },
  modeSelector: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modeButton: {
    padding: '12px 18px',
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 16,
    minWidth: 120,
  },
  modeButtonActive: {
    padding: '12px 18px',
    borderRadius: 12,
    border: '2px solid #2b0a78',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    minWidth: 120,
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
    minHeight: 220,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    resize: 'vertical',
    background: '#fff',
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
  actionRow: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  presentButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#2e7d32',
    color: '#fff',
    fontSize: 14,
    flex: 1,
    minWidth: 120,
  },
  absentButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#c62828',
    color: '#fff',
    fontSize: 14,
    flex: 1,
    minWidth: 120,
  },
  presentActive: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '2px solid #1b5e20',
    background: '#43a047',
    color: '#fff',
    fontSize: 14,
    flex: 1,
    minWidth: 120,
  },
  absentActive: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '2px solid #8e0000',
    background: '#e53935',
    color: '#fff',
    fontSize: 14,
    flex: 1,
    minWidth: 120,
  },
  primaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 120,
  },
  whatsappButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: 'none',
    background: '#25D366',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 160,
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
  secondaryButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    background: '#fff',
    color: '#2b0a78',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 120,
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
  resumeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
    minWidth: 0,
    wordBreak: 'break-word',
    boxSizing: 'border-box',
  },
  readBox: {
    background: '#fff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    boxSizing: 'border-box',
    maxHeight: 320,
    overflowY: 'auto',
    textAlign: 'left',
  },
  readTitle: {
    marginTop: 0,
    marginBottom: 10,
    color: '#2b0a78',
    fontSize: 18,
    textAlign: 'left',
  },
  readText: {
    margin: 0,
    color: '#333',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    wordBreak: 'break-word',
    textAlign: 'left',
  },
// Commentaire
  fcfaNote: {
    textAlign: 'center',
    marginTop: 12,
    color: '#6f5b84',
    fontStyle: 'italic',
  },

}
