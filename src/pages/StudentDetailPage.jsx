import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'

export default function StudentDetailPage({ studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [seances, setSeances] = useState([])
  const [presences, setPresences] = useState({})
  const [message, setMessage] = useState('')

  const qrWrapperRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [studentId])

  async function loadData() {
    setMessage('')

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (studentError) {
      console.log(studentError)
      setMessage('Erreur chargement étudiant')
      return
    }

    setStudent(studentData)

    if (!studentData?.class_id) return

    const { data: seancesData, error: seancesError } = await supabase
      .from('seances')
      .select('*')
      .eq('class_id', studentData.class_id)
      .order('numero_seance', { ascending: true })

    if (seancesError) {
      console.log(seancesError)
      setMessage('Erreur chargement séances')
      return
    }

    setSeances(seancesData || [])

    const { data: pres, error: presError } = await supabase
      .from('presences')
      .select('*')
      .eq('student_id', studentId)

    if (presError) {
      console.log(presError)
      setMessage('Erreur chargement présences')
      return
    }

    const map = {}
    ;(pres || []).forEach((p) => {
      map[p.seance_id] = p.statut
    })

    setPresences(map)
  }

  function getCoursFaits() {
    return Object.values(presences).filter((v) => v === 'present').length
  }

  function getCoursAbsents() {
    return Object.values(presences).filter((v) => v === 'absent').length
  }

  function getCoursNonPointes() {
    return seances.length - getCoursFaits() - getCoursAbsents()
  }

  function getCoursRates() {
    return getCoursAbsents()
  }

  function getContributionAttendue() {
    const blocs = Math.floor(getCoursFaits() / 4)
    return blocs * 5000
  }

  function isContributionOk() {
    const blocs = Math.floor(getCoursFaits() / 4)
    return (student?.contribution_avance || 0) >= blocs
  }

  function getStatutSeance(seanceId) {
    if (presences[seanceId] === 'present') return 'Présent'
    if (presences[seanceId] === 'absent') return 'Absent'
    return 'Non pointé'
  }

  function getStatutStyle(seanceId) {
    if (presences[seanceId] === 'present') {
      return styles.seancePresent
    }

    if (presences[seanceId] === 'absent') {
      return styles.seanceAbsent
    }

    return styles.seanceNeutral
  }

  function downloadQr() {
    const svg = qrWrapperRef.current?.querySelector('svg')

    if (!svg || !student?.matricule) {
      setMessage('QR introuvable')
      return
    }

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const svgUrl = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 1000
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)

      ctx.drawImage(image, 0, 0, size, size)

      URL.revokeObjectURL(svgUrl)

      const pngUrl = canvas.toDataURL('image/png')

      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `qr-${student.matricule}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setMessage('QR téléchargé en PNG')
    }

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      setMessage('Erreur conversion QR')
    }

    image.src = svgUrl
  }

  if (!student) {
    return (
      <div style={styles.page}>
        <button type="button" style={styles.backButton} onClick={onBack}>
          ← Retour
        </button>

        <div style={styles.card}>
          <p>Chargement...</p>
          {message ? <p style={styles.message}>{message}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <button type="button" style={styles.backButton} onClick={onBack}>
        ← Retour
      </button>

      <div style={styles.card}>
        <h2 style={styles.title}>
          {student.nom} {student.prenom}
        </h2>

        <p style={styles.meta}>
          <strong>Matricule :</strong> {student.matricule || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Ministère :</strong> {student.ministere || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Profession :</strong> {student.profession || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Dénomination :</strong> {student.denomination || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Quartier :</strong> {student.quartier || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Signature :</strong> {student.signature || '-'}
        </p>

        <p style={styles.meta}>
          <strong>Inscription :</strong> {student.inscription_paye ? 'Payée' : 'Non payée'}
        </p>

        <p style={styles.meta}>
          <strong>Contribution à jour :</strong> {isContributionOk() ? 'Oui' : 'Non'}
        </p>

        <p style={styles.meta}>
          <strong>Contribution attendue :</strong> {getContributionAttendue()} FCFA
        </p>

        {message ? <p style={styles.message}>{message}</p> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>QR Code étudiant</h3>

        {student.matricule ? (
          <div style={styles.qrBox}>
            <div ref={qrWrapperRef} style={styles.qrCard}>
              <QRCodeSVG
                value={student.matricule.trim()}
                size={320}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={true}
              />
            </div>

            <p style={styles.qrText}>{student.matricule}</p>

            <button
              type="button"
              style={styles.downloadButton}
              onClick={downloadQr}
            >
              Télécharger le QR
            </button>

            <p style={styles.qrHelp}>
              Utilise un autre appareil pour scanner ce QR.
            </p>
          </div>
        ) : (
          <p style={styles.emptyText}>Aucun matricule trouvé.</p>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Résumé</h3>

        <div style={styles.resumeGrid}>
          <div style={styles.resumeBox}>
            <strong>{seances.length}</strong>
            <span>Total séances</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getCoursFaits()}</strong>
            <span>Cours suivis</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getCoursRates()}</strong>
            <span>Cours ratés</span>
          </div>

          <div style={styles.resumeBox}>
            <strong>{getCoursNonPointes()}</strong>
            <span>Non pointés</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Détail des séances</h3>

        {seances.length === 0 ? (
          <p style={styles.emptyText}>Aucune séance pour cette classe.</p>
        ) : (
          seances.map((s) => (
            <div
              key={s.id}
              style={{
                ...styles.seanceItem,
                ...getStatutStyle(s.id),
              }}
            >
              <div style={styles.seanceTop}>
                <strong>{s.chapitre || 'Chapitre'}</strong>
                <span>{getStatutSeance(s.id)}</span>
              </div>

              <div style={styles.seanceMeta}>
                <span>Date : {s.date_seance || '-'}</span>
                <span>Numéro : {s.numero_seance || '-'}</span>
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

  backButton: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #2b0a78',
    background: '#fff',
    color: '#2b0a78',
    fontWeight: 'bold',
    fontSize: 15,
  },

  card: {
    background: '#fff',
    border: '2px solid #e3d8f5',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    boxShadow: '0 10px 24px rgba(43, 10, 120, 0.08)',
  },

  title: {
    marginTop: 0,
    marginBottom: 16,
    textAlign: 'center',
    color: '#2b0a78',
    fontSize: 30,
    fontWeight: 'bold',
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  },

  meta: {
    margin: '8px 0',
    color: '#444',
    fontSize: 16,
    lineHeight: 1.5,
  },

  message: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 16,
  },

  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },

  qrCard: {
    background: '#ffffff',
    padding: 24,
    borderRadius: 18,
    border: '2px solid #eadcf9',
    boxShadow: '0 8px 18px rgba(43, 10, 120, 0.08)',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#2b0a78',
    textAlign: 'center',
    wordBreak: 'break-word',
  },

  qrHelp: {
    margin: 0,
    color: '#6f5b84',
    fontSize: 14,
    textAlign: 'center',
  },

  downloadButton: {
    padding: '14px 18px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(90deg, #2b0a78 0%, #d4148e 100%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    boxShadow: '0 8px 18px rgba(212, 20, 142, 0.18)',
  },

  resumeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 12,
  },

  resumeBox: {
    background: '#fbf8ff',
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'center',
    color: '#2b0a78',
    fontWeight: 'bold',
  },

  seanceItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #ddd',
  },

  seanceTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
    color: '#2b0a78',
  },

  seanceMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    color: '#555',
    fontSize: 14,
  },

  seancePresent: {
    background: '#f1fbf3',
    border: '1px solid #b9e2c0',
  },

  seanceAbsent: {
    background: '#fff3f3',
    border: '1px solid #f0b7b7',
  },

  seanceNeutral: {
    background: '#fafafa',
    border: '1px solid #ddd',
  },

  emptyText: {
    textAlign: 'center',
    color: '#555',
  },
}
