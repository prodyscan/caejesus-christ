import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../supabaseClient'

const INSCRIPTION_MONTANT = 10000
const CONTRIBUTION_PAR_BLOC = 5000
const SEANCES_PAR_BLOC = 4

export default function StudentDetailPage({ studentId, onBack, profile }) {
  const [student, setStudent] = useState(null)
  const [seances, setSeances] = useState([])
  const [presences, setPresences] = useState({})
  const [paiements, setPaiements] = useState([])
  const [message, setMessage] = useState('')

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    loadData()
  }, [studentId])

  async function loadData() {
    setMessage('')

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        *,
        classes (
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
      .order('numero_seance', { ascending: true })

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

  async function toggleCertificat() {
    if (!isAdmin || !student) {
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

    loadData()
  }

  function getCoursFaits() {
    return Object.values(presences).filter((v) => v === 'present').length
  }

  function getCoursRates() {
    return Object.values(presences).filter((v) => v === 'absent').length
  }

  function getCoursNonPointes() {
    return seances.length - getCoursFaits() - getCoursRates()
  }

  function getInscriptionPaid() {
    return paiements
      .filter((p) => p.type_paiement === 'inscription' || p.type_paiement === 'inscription_arriere')
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getContributionPaid() {
    return paiements
      .filter((p) => p.type_paiement === 'contribution' || p.type_paiement === 'contribution_arriere')
      .reduce((sum, p) => sum + Number(p.montant || 0), 0)
  }

  function getContributionExpected() {
    const blocs = Math.floor(getCoursFaits() / SEANCES_PAR_BLOC)
    return blocs * CONTRIBUTION_PAR_BLOC
  }

  function isContributionOk() {
    return getContributionPaid() >= getContributionExpected()
  }

  if (!student) {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={onBack}>
          ← Retour
        </button>
        <p>Chargement...</p>
      </div>
    )
  }

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

        <p><strong>Matricule :</strong> {student.matricule || '-'}</p>
        <p><strong>Centre :</strong> {student.classes?.nom || '-'}</p>
        <p><strong>Année :</strong> {student.classes?.annee || '-'}</p>
        <p><strong>Sexe :</strong> {student.sexe || '-'}</p>
        <p><strong>Numéro de téléphone :</strong> {student.telephone || '-'}</p>
        <p><strong>Numéro téléphonique secondaire :</strong> {student.telephone_secondaire || '-'}</p>
        <p><strong>Email :</strong> {student.email || '-'}</p>
        <p><strong>Date de naissance :</strong> {student.date_naissance || '-'}</p>
        <p><strong>Lieu de naissance :</strong> {student.lieu_naissance || '-'}</p>
        <p><strong>Ministère :</strong> {student.ministere || '-'}</p>
        <p><strong>Profession :</strong> {student.profession || '-'}</p>
        <p><strong>Dénomination :</strong> {student.denomination || '-'}</p>
        <p><strong>Quartier :</strong> {student.quartier || '-'}</p>
        <p><strong>Signature :</strong> {student.signature || '-'}</p>
        <p><strong>Inscription :</strong> {getInscriptionPaid() >= INSCRIPTION_MONTANT ? 'Payée' : 'Non payée'}</p>
        <p><strong>Contribution à jour :</strong> {isContributionOk() ? 'Oui' : 'Non'}</p>
        <p><strong>Contribution attendue :</strong> {getContributionExpected()} FCFA</p>
        <p><strong>Contribution payée :</strong> {getContributionPaid()} FCFA</p>
        <p><strong>Date réception certificat :</strong> {student.date_reception_certificat || '-'}</p>

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
        <h3>QR Code étudiant</h3>

        {student.matricule ? (
          <div style={styles.qrBox}>
            <QRCodeSVG value={student.matricule} size={220} />
            <p style={styles.qrText}>{student.matricule}</p>
          </div>
        ) : (
          <p>Aucun matricule trouvé.</p>
        )}
      </div>

      <div style={styles.card}>
        <h3>Résumé présence</h3>
        <p><strong>Total séances :</strong> {seances.length}</p>
        <p><strong>Cours suivis :</strong> {getCoursFaits()}</p>
        <p><strong>Cours ratés :</strong> {getCoursRates()}</p>
        <p><strong>Non pointés :</strong> {getCoursNonPointes()}</p>
      </div>

      <div style={styles.card}>
        <h3>Détail des séances</h3>

        {seances.length === 0 ? (
          <p>Aucune séance pour ce centre.</p>
        ) : (
          seances.map((s) => (
            <div key={s.id} style={styles.seanceItem}>
              <strong>{s.chapitre}</strong>
              <div>
                {presences[s.id] === 'present'
                  ? 'Présent'
                  : presences[s.id] === 'absent'
                  ? 'Absent'
                  : 'Non pointé'}
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
    border: '2px solid #999',
    background: '#fff',
    fontWeight: 'bold',
  },
  card: {
    background: '#fff',
    border: '2px solid #ddd',
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
  qrBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  qrText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  seanceItem: {
    marginBottom: 8,
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 12,
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
}
