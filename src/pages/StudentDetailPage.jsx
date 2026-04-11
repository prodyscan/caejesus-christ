import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'

const INSCRIPTION_MONTANT = 10000
const INSCRIPTION_MONTANT_COUPLE = 5000
const CONTRIBUTION_PAR_BLOC = 5000
const CONTRIBUTION_PAR_BLOC_COUPLE = 2500
const SEANCES_PAR_BLOC = 4

export default function StudentDetailPage({ studentId, onBack, profile }) {
  const [student, setStudent] = useState(null)
  const [seances, setSeances] = useState([])
  const [rattrapages, setRattrapages] = useState([])
  const [presences, setPresences] = useState({})
  const [paiements, setPaiements] = useState([])
  const [message, setMessage] = useState('')
  const [showCertificatForm, setShowCertificatForm] = useState(false)
  const [certificatDate, setCertificatDate] = useState('')
  const [ancienCoursValidesCalcules, setAncienCoursValidesCalcules] = useState(0)

  const qrWrapperRef = useRef(null)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    loadData()
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchRattrapages()
  }, [studentId])

  async function loadData() {
    setMessage('')
    setAncienCoursValidesCalcules(0)

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        classes!students_class_id_fkey (
          id,
          nom,
          annee
        )
      `)
      .eq('id', studentId)
      .single()

    if (studentError) {
      console.log(studentError)
      setMessage('Erreur chargement étudiant')
      return
    }

    setStudent(studentData)

    if (!studentData?.class_id) return

    const { data: seancesData } = await supabase
      .from('seances')
      .select('*')
      .eq('class_id', studentData.class_id)
      .order('date_seance', { ascending: true })

    setSeances(seancesData || [])

    const { data: pres } = await supabase
      .from('presences')
      .select('*')
      .eq('student_id', studentId)

    const map = {}
    ;(pres || []).forEach((p) => {
      map[p.seance_id] = p.statut
    })
    setPresences(map)

    const { data: paiementsData } = await supabase
      .from('paiements')
      .select('*')
      .eq('student_id', studentId)

    setPaiements(paiementsData || [])

    if (studentData.est_transfere && studentData.ancien_class_id) {
      const { data: anciennesSeancesData, error: anciennesSeancesError } =
        await supabase
          .from('seances')
          .select('id, chapitre')
          .eq('class_id', studentData.ancien_class_id)

      if (anciennesSeancesError) {
        console.log(anciennesSeancesError)
      } else {
        let totalAncienValide = 0

        ;(anciennesSeancesData || []).forEach((seance) => {
          if (map[seance.id] === 'present') {
            totalAncienValide += countCoursesInSeance(seance.chapitre)
          }
        })

        setAncienCoursValidesCalcules(totalAncienValide)
      }
    }
  }

  async function fetchRattrapages() {
    const { data: rattrapagesData, error: rattrapagesError } = await supabase
      .from('rattrapages')
      .select('*')
      .eq('student_id', studentId)

    if (!rattrapagesError) {
      setRattrapages(rattrapagesData || [])
    }
  }

  function countCoursesInSeance(chapitreText) {
    if (!chapitreText) return 0

    return String(chapitreText)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
  }

  function toDateOnly(value) {
    if (!value) return null

    const text = String(value).slice(0, 10)
    const parts = text.split('-')

    if (parts.length !== 3) return null

    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])

    if (!year || !month || !day) return null

    return new Date(year, month - 1, day, 0, 0, 0, 0)
  }

  function getStudentEntryDate() {
    if (!student) return null

    if (student.date_ajout_etudiant) {
      return toDateOnly(student.date_ajout_etudiant)
    }

    if (student.created_at) {
      return toDateOnly(student.created_at)
    }

    return null
  }

  function isSeanceBeforeStudentEntry(seance) {
    const seanceDate = toDateOnly(seance?.date_seance)
    const entryDate = getStudentEntryDate()

    if (!seanceDate || !entryDate) return false

    return seanceDate.getTime() < entryDate.getTime()
  }

  function getInscriptionExpected() {
    if (student?.est_en_couple) return INSCRIPTION_MONTANT_COUPLE
    return INSCRIPTION_MONTANT
  }

  function getContributionParBloc() {
    if (student?.est_en_couple) return CONTRIBUTION_PAR_BLOC_COUPLE
    return CONTRIBUTION_PAR_BLOC
  }

  const coursRates = useMemo(() => {
    const lignes = []

    seances.forEach((seance) => {
      const estAvantEntree = isSeanceBeforeStudentEntry(seance)
      const estAbsent = presences[seance.id] === 'absent'
      const estRattrape = rattrapages.some(
        (r) => String(r.seance_id) === String(seance.id)
      )

      if (estRattrape) return
      if (!estAvantEntree && !estAbsent) return

      const chapitres = String(seance.chapitre || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (chapitres.length === 0) {
        lignes.push({
          seanceId: estAvantEntree
            ? `before-entry-${seance.id}`
            : String(seance.id),
          date: seance.date_seance || '-',
          chapitre: '-',
        })
      } else {
        chapitres.forEach((chapitre, index) => {
          lignes.push({
            seanceId: estAvantEntree
              ? `before-entry-${seance.id}-${index}`
              : `${seance.id}-${index}`,
            date: seance.date_seance || '-',
            chapitre,
          })
        })
      }
    })

    return lignes
  }, [seances, presences, rattrapages, student])

  function getCourseCardStyle(seanceId, seance) {
    const estRattrape = rattrapages.some(
      (r) => String(r.seance_id) === String(seanceId)
    )

    const statut = presences[seanceId]
    const estRateParAjout = !statut && isSeanceBeforeStudentEntry(seance)

    if (estRattrape) return styles.courseCaughtUpCard
    if (statut === 'present') return styles.courseDoneCard
    if (statut === 'absent' || estRateParAjout) return styles.courseMissedCard
    return styles.courseCard
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
  }

  function callStudent(phone) {
    const cleanPhone = formatPhoneForLink(phone)
    if (!cleanPhone) {
      setMessage('Aucun numéro téléphone')
      return
    }

    window.location.href = `tel:${cleanPhone}`
  }

  function toggleCertificat() {
    if (!isAdmin || !student) {
      setMessage("Seul l'administrateur peut valider le certificat")
      return
    }

    if (student.certificat_recu) {
      removeCertificat()
      return
    }

    setCertificatDate(
      student.date_reception_certificat || new Date().toISOString().slice(0, 10)
    )
    setShowCertificatForm(true)
    setMessage('')
  }

  async function confirmCertificat() {
    if (!student) return

    if (!certificatDate) {
      setMessage('Choisis la date de réception du certificat')
      return
    }

    const { error } = await supabase
      .from('students')
      .update({
        certificat_recu: true,
        date_reception_certificat: certificatDate,
      })
      .eq('id', student.id)

    if (error) {
      console.log(error)
      setMessage('Erreur mise à jour certificat')
      return
    }

    setShowCertificatForm(false)
    setCertificatDate('')
    setMessage('Certificat validé')
    loadData()
  }

  async function removeCertificat() {
    if (!student) return

    const ok = window.confirm('Retirer la validation du certificat ?')
    if (!ok) return

    const { error } = await supabase
      .from('students')
      .update({
        certificat_recu: false,
        date_reception_certificat: null,
      })
      .eq('id', student.id)

    if (error) {
      console.log(error)
      setMessage('Erreur mise à jour certificat')
      return
    }

    setShowCertificatForm(false)
    setCertificatDate('')
    setMessage('Validation certificat retirée')
    loadData()
  }

  function getCoursFaits() {
    const coursPresents = seances.reduce((sum, seance) => {
      if (presences[seance.id] === 'present') {
        return sum + countCoursesInSeance(seance.chapitre)
      }
      return sum
    }, 0)

    const coursRattrapes = rattrapages.length

    return coursPresents + coursRattrapes
  }

  function getCoursRates() {
    return seances.reduce((sum, seance) => {
      const estAbsent = presences[seance.id] === 'absent'
      const estAvantEntree = isSeanceBeforeStudentEntry(seance)
      const estRattrape = rattrapages.some(
        (r) => String(r.seance_id) === String(seance.id)
      )

      if (estRattrape) return sum

      if (estAbsent || estAvantEntree) {
        return sum + countCoursesInSeance(seance.chapitre)
      }

      return sum
    }, 0)
  }

  function getCoursNonPointes() {
    return seances.reduce((sum, seance) => {
      const estAvantEntree = isSeanceBeforeStudentEntry(seance)
      const statut = presences[seance.id]
      const estRattrape = rattrapages.some(
        (r) => String(r.seance_id) === String(seance.id)
      )

      if (estAvantEntree) return sum
      if (estRattrape) return sum
      if (statut === 'present') return sum
      if (statut === 'absent') return sum

      return sum + countCoursesInSeance(seance.chapitre)
    }, 0)
  }

  function getAncienValideTransfert() {
    const valeurEnregistree = Number(
      student?.seances_validees_avant_transfert || 0
    )

    if (valeurEnregistree > 0) return valeurEnregistree
    return Number(ancienCoursValidesCalcules || 0)
  }

  function getResumeTransfert() {
    const ancienValide = getAncienValideTransfert()
    const nouveauFait = getTotalCours()
    const rattrapagesValides = getNombreRattrapagesValides()

    const rattrapageBrut = Math.max(nouveauFait - ancienValide, 0)
    const rattrapageRestant = Math.max(rattrapageBrut - rattrapagesValides, 0)

    return {
      ancienValide,
      nouveauFait,
      seancesReconues: Math.min(
        ancienValide + rattrapagesValides,
        nouveauFait
      ),
      surplusIgnore: Math.max(ancienValide - nouveauFait, 0),
      rattrapagesValides,
      rattrapage: rattrapageRestant,
    }
  }

  function getTotalCours() {
    return seances.reduce((sum, seance) => {
      return sum + countCoursesInSeance(seance.chapitre)
    }, 0)
  }

  function getNombreRattrapagesValides() {
    return rattrapages.length
  }

  function getResumePresenceAffiche() {
    if (!student) {
      return {
        totalCours: 0,
        coursReconus: 0,
        coursRates: 0,
        rattrapage: 0,
        surplusIgnore: 0,
      }
    }

    if (student.est_transfere) {
      const ancienValide = getAncienValideTransfert()
      const totalCours = getTotalCours()
      const rattrapagesValides = getNombreRattrapagesValides()

      const coursReconus = Math.min(
        ancienValide + rattrapagesValides,
        totalCours
      )

      const rattrapageRestant = Math.max(totalCours - coursReconus, 0)

      return {
        totalCours,
        coursReconus,
        coursRates: 0,
        rattrapage: rattrapageRestant,
        surplusIgnore: Math.max(ancienValide - totalCours, 0),
      }
    }

    return {
      totalCours: getTotalCours(),
      coursReconus: getCoursFaits(),
      coursRates: getCoursRates(),
      rattrapage: getCoursNonPointes(),
      surplusIgnore: 0,
    }
  }

  function getSeancesRatees() {
    return seances.filter((s) => {
      const statut = presences[s.id]
      const estRattrape = rattrapages.some(
        (r) => String(r.seance_id) === String(s.id)
      )

      if (estRattrape) return false
      if (statut === 'absent') return true
      if (!statut && isSeanceBeforeStudentEntry(s)) return true

      return false
    })
  }

  function getInscriptionPaid() {
    return paiements
      .filter(
        (p) =>
          p.type_paiement === 'inscription' ||
          p.type_paiement === 'inscription_arrieree'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getContributionPaid() {
    return paiements
      .filter(
        (p) =>
          p.type_paiement === 'contribution' ||
          p.type_paiement === 'contribution_arrieree'
      )
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getContributionExpected() {
    const blocs = Math.floor(getCoursFaits() / SEANCES_PAR_BLOC)
    return blocs * getContributionParBloc()
  }

  function isContributionOk() {
    return getContributionPaid() >= getContributionExpected()
  }

  function formatDate(dateValue) {
    if (!dateValue) return '-'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return dateValue
    return date.toLocaleDateString('fr-FR')
  }

  function downloadQrCode() {
    if (!student?.matricule) {
      setMessage('Aucun matricule trouvé')
      return
    }

    const svg = qrWrapperRef.current?.querySelector('svg')
    if (!svg) {
      setMessage('QR code introuvable')
      return
    }

    try {
      const serializer = new XMLSerializer()
      const source = serializer.serializeToString(svg)
      const svgBlob = new Blob([source], {
        type: 'image/svg+xml;charset=utf-8',
      })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 700

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          setMessage('Impossible de générer le QR')
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.drawImage(img, 80, 40, 440, 440)
        ctx.fillStyle = '#2b0a78'
        ctx.font = 'bold 28px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(student.matricule, canvas.width / 2, 540)

        const fullName = `${student.nom || ''} ${student.prenom || ''}`.trim()
        ctx.font = '24px Arial'
        ctx.fillStyle = '#444'
        ctx.fillText(fullName || 'Étudiant', canvas.width / 2, 590)

        const pngUrl = canvas.toDataURL('image/png')

        const link = document.createElement('a')
        link.href = pngUrl
        link.download = `${student.matricule}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)
        setMessage('QR code téléchargé en PNG')
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        setMessage('Erreur téléchargement QR')
      }

      img.src = url
    } catch (error) {
      console.log(error)
      setMessage('Erreur téléchargement QR')
    }
  }

  if (!student) {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={onBack}>
          ← Retour
        </button>
        <p>Chargement...</p>
        {message ? <p style={styles.message}>{message}</p> : null}
      </div>
    )
  }

  const resumeTransfert = student.est_transfere
    ? getResumeTransfert()
    : null

  const resumePresenceAffiche = getResumePresenceAffiche()

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        ← Retour
      </button>

      <div style={styles.card}>
        <h2
          style={{
            ...styles.title,
            color: student.certificat_recu ? '#1565c0' : '#2b0a78',
          }}
        >
          {student.nom} {student.prenom}
        </h2>

        {student.certificat_recu && (
          <div style={styles.certBadge}>Certificat reçu</div>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}

        <div style={styles.detailsGrid}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Matricule</span>
            <span style={styles.detailValue}>{student.matricule || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Centre</span>
            <span style={styles.detailValue}>{student.classes?.nom || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Année</span>
            <span style={styles.detailValue}>{student.classes?.annee || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Sexe</span>
            <span style={styles.detailValue}>{student.sexe || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Couple</span>
            <span style={styles.detailValue}>
              {student.est_en_couple ? 'Oui' : 'Non'}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Téléphone</span>
            <span style={styles.detailValue}>{student.telephone || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Téléphone secondaire</span>
            <span style={styles.detailValue}>
              {student.telephone_secondaire || '-'}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Email</span>
            <span style={styles.detailValue}>{student.email || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Date de naissance</span>
            <span style={styles.detailValue}>
              {formatDate(student.date_naissance)}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Lieu de naissance</span>
            <span style={styles.detailValue}>{student.lieu_naissance || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Ministère</span>
            <span style={styles.detailValue}>{student.ministere || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Profession</span>
            <span style={styles.detailValue}>{student.profession || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Dénomination</span>
            <span style={styles.detailValue}>{student.denomination || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Quartier</span>
            <span style={styles.detailValue}>{student.quartier || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Signature</span>
            <span style={styles.detailValue}>{student.signature || '-'}</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Inscription attendue</span>
            <span style={styles.detailValue}>{getInscriptionExpected()} FCFA</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Inscription payée</span>
            <span style={styles.detailValue}>{getInscriptionPaid()} FCFA</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Inscription</span>
            <span style={styles.detailValue}>
              {getInscriptionPaid() >= getInscriptionExpected()
                ? 'Payée'
                : 'Non payée'}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Contribution par bloc</span>
            <span style={styles.detailValue}>{getContributionParBloc()} FCFA</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Contribution à jour</span>
            <span style={styles.detailValue}>
              {isContributionOk() ? 'Oui' : 'Non'}
            </span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Contribution attendue</span>
            <span style={styles.detailValue}>{getContributionExpected()} FCFA</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Contribution payée</span>
            <span style={styles.detailValue}>{getContributionPaid()} FCFA</span>
          </div>

          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Date réception certificat</span>
            <span style={styles.detailValue}>
              {student.date_reception_certificat
                ? formatDate(student.date_reception_certificat)
                : '-'}
            </span>
          </div>
        </div>

        {isAdmin && showCertificatForm && !student.certificat_recu && (
          <div style={styles.certificatBox}>
            <p style={styles.certificatTitle}>Date de réception du certificat</p>

            <input
              type="date"
              style={styles.input}
              value={certificatDate}
              onChange={(e) => setCertificatDate(e.target.value)}
            />

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.certButton}
                onClick={confirmCertificat}
              >
                Confirmer certificat
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setShowCertificatForm(false)
                  setCertificatDate('')
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div style={styles.actionRow}>
          <button
            type="button"
            style={styles.whatsappButton}
            onClick={() => openWhatsApp(student.telephone)}
          >
            WhatsApp
          </button>

          <button
            type="button"
            style={styles.callButton}
            onClick={() => callStudent(student.telephone)}
          >
            Appeler
          </button>

          {isAdmin && (
            <button
              type="button"
              style={styles.certButton}
              onClick={toggleCertificat}
            >
              {student.certificat_recu ? 'Retirer certificat' : 'Valider certificat'}
            </button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>QR Code étudiant</h3>

        {student.matricule ? (
          <div style={styles.qrBox} ref={qrWrapperRef}>
            <QRCodeSVG value={student.matricule} size={220} />
            <p style={styles.qrText}>{student.matricule}</p>

            <button
              type="button"
              style={styles.downloadButton}
              onClick={downloadQrCode}
            >
              Télécharger QR
            </button>
          </div>
        ) : (
          <p>Aucun matricule trouvé.</p>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Résumé présence</h3>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryBox}>
            <strong>{resumePresenceAffiche.totalCours}</strong>
            <span>Total cours</span>
          </div>

          <div style={{ ...styles.summaryBox, borderColor: '#cdeed8' }}>
            <strong style={{ color: '#2e7d32' }}>
              {resumePresenceAffiche.coursReconus}
            </strong>
            <span style={{ color: '#2e7d32' }}>
              {student.est_transfere ? 'Cours reconnus' : 'Cours faits'}
            </span>
          </div>

          <div style={{ ...styles.summaryBox, borderColor: '#f3c4c4' }}>
            <strong style={{ color: '#d91e18' }}>
              {resumePresenceAffiche.coursRates}
            </strong>
            <span style={{ color: '#d91e18' }}>Cours ratés</span>
          </div>

          <div style={styles.summaryBox}>
            <strong>{resumePresenceAffiche.rattrapage}</strong>
            <span>{student.est_transfere ? 'À rattraper' : 'Non pointés'}</span>
          </div>
        </div>
      </div>

      {student.est_transfere && resumeTransfert && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Résumé transfert</h3>

          <p>
            <strong>Séances validées ancien centre :</strong>{' '}
            {resumeTransfert.ancienValide}
          </p>

          <p>
            <strong>Séances faites nouveau centre :</strong>{' '}
            {resumeTransfert.nouveauFait}
          </p>

          <p>
            <strong>Séances reconnues :</strong>{' '}
            {resumeTransfert.seancesReconues}
          </p>

          <p>
            <strong>Surplus ignoré :</strong>{' '}
            {resumeTransfert.surplusIgnore}
          </p>

          <p>
            <strong>Rattrapages validés :</strong>{' '}
            {resumeTransfert.rattrapagesValides}
          </p>

          <p>
            <strong>Cours à rattraper :</strong>{' '}
            {resumeTransfert.rattrapage}
          </p>

          <p>
            <strong>Date transfert :</strong>{' '}
            {student.date_transfert || '-'}
          </p>
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>
          {student.est_transfere ? 'Rattrapages déjà effectués' : 'Cours rattrapés'}
        </h3>

        {rattrapages.length === 0 ? (
          <p>Aucun cours rattrapé.</p>
        ) : (
          rattrapages.map((item) => {
            const seance = seances.find(
              (s) => String(s.id) === String(item.seance_id)
            )

            return (
              <div key={item.id} style={styles.courseCard}>
                <strong style={styles.courseTitle}>
                  {item.chapitre_label || seance?.chapitre || '-'}
                </strong>

                <p style={styles.meta}>
                  Date séance ratée : {seance?.date_seance || '-'}
                </p>

                <p style={styles.coursRattrape}>
                  Rattrapé le : {item.date_rattrapage}
                </p>
              </div>
            )
          })
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Cours ratés</h3>

        {coursRates.length === 0 ? (
          <p style={styles.emptyText}>Aucun cours raté.</p>
        ) : (
          coursRates.map((item) => (
            <div
              key={item.seanceId}
              style={{
                ...styles.seanceItem,
                borderColor: '#f3c4c4',
                background: '#fff7f7',
              }}
            >
              <strong style={{ color: '#d91e18' }}>{item.chapitre || '-'}</strong>

              <div style={{ color: '#d91e18', marginTop: 8 }}>
                Date : {formatDate(item.date)}
              </div>

              <div
                style={{
                  color: '#d91e18',
                  fontWeight: 'bold',
                  marginTop: 6,
                }}
              >
                Absent
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Détail des séances</h3>

        {seances.length === 0 ? (
          <p style={styles.emptyText}>Aucune séance pour ce centre.</p>
        ) : (
          seances.map((s) => {
            const estRattrape = rattrapages.some(
              (r) => String(r.seance_id) === String(s.id)
            )

            const statut = estRattrape
              ? 'rattrape'
              : isSeanceBeforeStudentEntry(s)
              ? 'absent'
              : presences[s.id] || 'non_pointe'

            return (
              <div key={s.id} style={getCourseCardStyle(s.id, s)}>
                <strong style={styles.seanceTitle}>{s.chapitre || '-'}</strong>
                <div style={styles.seanceDate}>Date : {formatDate(s.date_seance)}</div>

                <div
                  style={
                    statut === 'rattrape'
                      ? styles.coursRattrape
                      : statut === 'present'
                      ? styles.coursSuivi
                      : statut === 'absent'
                      ? styles.coursRate
                      : styles.statusNeutral
                  }
                >
                  {statut === 'rattrape'
                    ? 'Rattrapé'
                    : statut === 'present'
                    ? 'Présent'
                    : statut === 'absent'
                    ? 'Absent'
                    : 'Non pointé'}
                </div>
              </div>
            )
          })
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

  backButton: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #999',
    background: '#fff',
    fontWeight: 'bold',
    color: '#2b0a78',
  },

  card: {
    background: '#fff',
    border: '2px solid #e3d8f5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 8px 20px rgba(43, 10, 120, 0.08)',
  },

  title: {
    marginTop: 0,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: 'bold',
    wordBreak: 'break-word',
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: '#6f5b84',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },

  courseTitle: {
    color: '#2b0a78',
    fontSize: 18,
    whiteSpace: 'pre-wrap',
  },

  certBadge: {
    margin: '0 auto 16px',
    width: 'fit-content',
    padding: '8px 14px',
    borderRadius: 999,
    background: '#1565c0',
    color: '#fff',
    fontWeight: 'bold',
  },

  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },

  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },

  detailRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 42%) 1fr',
    gap: 10,
    alignItems: 'start',
    paddingBottom: 8,
    borderBottom: '1px solid #f0e6ff',
  },

  detailLabel: {
    color: '#5f5473',
    fontWeight: 'bold',
    wordBreak: 'break-word',
  },

  detailValue: {
    color: '#333',
    textAlign: 'left',
    wordBreak: 'break-word',
  },

  actionRow: {
    display: 'flex',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },

  whatsappButton: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    border: 'none',
    background: '#25D366',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  callButton: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    border: 'none',
    background: '#1565c0',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  certButton: {
    flex: 1,
    minWidth: 160,
    padding: 14,
    borderRadius: 14,
    border: '2px solid #1565c0',
    background: '#fff',
    color: '#1565c0',
    fontWeight: 'bold',
    fontSize: 16,
  },

  secondaryButton: {
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

  certificatBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    border: '2px solid #d8c8ef',
    background: '#fbf8ff',
  },

  certificatTitle: {
    marginTop: 0,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#2b0a78',
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

  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },

  qrText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#2b0a78',
  },

  downloadButton: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 10,
  },

  summaryBox: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: '#2b0a78',
  },

  seanceItem: {
    marginBottom: 10,
    padding: 14,
    border: '1px solid #eadcf9',
    borderRadius: 12,
    background: '#fff',
  },

  seanceTitle: {
    color: '#2b0a78',
    display: 'block',
    marginBottom: 8,
    whiteSpace: 'pre-wrap',
  },

  seanceDate: {
    color: '#666',
    marginBottom: 8,
  },

  statusPresent: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },

  statusAbsent: {
    color: '#d91e18',
    fontWeight: 'bold',
  },

  statusNeutral: {
    color: '#777',
    fontWeight: 'bold',
  },

  emptyText: {
    textAlign: 'center',
    color: '#555',
  },

  courseCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },

  courseDoneCard: {
    border: '2px solid #2e7d32',
    background: '#eef8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  courseMissedCard: {
    border: '2px solid #d91e18',
    background: '#fff1f1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  courseCaughtUpCard: {
    border: '2px solid #1565c0',
    background: '#eef5ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  coursSuivi: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },

  coursRate: {
    color: '#d91e18',
    fontWeight: 'bold',
  },

  coursRattrape: {
    color: '#1565c0',
    fontWeight: 'bold',
  },

  meta: {
    margin: '6px 0',
    color: '#666',
    wordBreak: 'break-word',
  },
}
