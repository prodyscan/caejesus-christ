import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import SeanceDetailPage from './SeanceDetailPage'

const SEANCES_1ERE_ANNEE = [
  'Introduction / Préambule',
  'Témoignage Toumodi',
  '1A : Comment savoir parler – Les paroles de murmures',
  '1B : CAD 1 – Envie, mauvaise pensée, songe et vision',
  '2 : Les faux témoignages',
  '3 : Les jugements sentencieux',
  'Méditation',
  '3-4 : Parole de colère',
  'Direction',
  '5 : CAD 2 – Idolâtrie charnelle – Adultère',
  '6 : Suite CAD 2 (parole de sagesse)',
  '8 : Parole de colère',
  '9 : Parole d’ingérence',
  '10 : Parole hautaine',
  '11 : Parole hautaine suite et fin',
  '12 : CAD 3 – inimitié, impudicité, parole de connaissance',
  '13 : Parole de contestation',
  '14 : Parole de contestation suite et fin',
  '15 : Parole de justification',
  '16 : Parole d’opposition',
  '17 : Parole charnelles',
  '18 : CAD 4 – Les querelles, meurtres, don de foi',
  '19 : Parole charnelle suite 1',
  '20 : Parole charnelle suite 2',
  '21 : Parole charnelle suite 3',
  '22 : CAD 5 – Animosités, vols, don de guérison',
  '23 : Parole charnelle fin',
  '24 : Parole charnelle de souillure',
  '25 : Comment entretenir notre communion avec DIEU',
  '26 : CAD 6 – Disputes, cupidités, don d’opérer les miracles',
  '27 : Comment entretenir notre communion',
  '28 : Comment entretenir notre communion',
  '29 : La vie de consécration',
  '30 : La vie de consécration',
  '31 : CAD 7 – Ivrognerie, méchanceté, prophétie',
  '32 : La vie de consécration',
  '33 : La vie de consécration',
  '34 : CAD 8 – La fraude, excès de table, don de discernement',
  '35 : La vie de consécration',
  '36 : La vie de consécration',
  '37 : CAD 9 – diversité et interprétation, chose semblable, dérèglement',
  '38 : L’amour divin (introduction et 1ère caractéristique)',
  '39 : 2ème caractéristique',
  '40 : 3ème caractéristique',
]

const SEANCES_2EME_ANNEE = [
  'D : 4ème caractéristique : l’amour pardonne tout',
  'HH : CAD 1 - la négligence',
  'E : 5ème caractéristique : l’amour est patient',
  'F : 6ème caractéristique : l’amour est plein de bonté',
  'G : 7ème caractéristique : l’amour n’est point envieux',
  'II : CAD 2 - la plaisanterie',
  'H : 8ème caractéristique : l’amour ne s’enfle point d’orgueil',
  'I : 9ème caractéristique : l’amour ne se vante point',
  'JJ : CAD 3 - l’ignorance',
  'K : 10ème caractéristique : l’amour ne fait rien de malhonnête',
  'L : 11ème-12ème caractéristique : l’amour ne cherche point son intérêt et ne s’irrite point',
  'M : 13ème caractéristique : l’amour ne soupçonne point le mal',
  'N : 14ème caractéristique : l’amour ne se réjouit pas de l’injustice',
  'OO : CAD 4 - Le mensonge',
  'P : introduction : La Foi chrétienne',
  'Q : la Foi chrétienne suite 1',
  'R : la Foi chrétienne suite 2',
  'S : la Foi chrétienne suite 3',
  'TT : CAD 5 - L’amertume',
  'T : la Foi chrétienne suite 4',
  'U : la Foi chrétienne suite 5',
  'V : la Foi chrétienne suite 6',
  'XX : CAD 6 - La clameur',
  'Y : la Foi chrétienne suite 7',
  'Z : la Foi chrétienne fin',
  'A1 A1 : CAD 7 - la rébellion',
  'A1 : Le responsable spirituel',
  'B1 : Le responsable spirituel suite et fin',
  'C1 : l’envoyé spirituel',
  'D1 : l’envoyé spirituel suite et fin',
  'C1 C1 : CAD 8 - le Découragement',
  'E1 : Comment prêcher, exhorter',
  'F1 : Comment prêcher, exhorter suite 1',
  'G1 : Comment prêcher, exhorter fin',
  'H1 : Ministère pastoral',
  'F1 F1 : CAD 9/10 - la calomnie et folle',
]

const SEANCES_3EME_ANNEE = [
  'CC : Ministère pastoral suite 1',
  'DD : Ministère pastoral suite 2',
  'EE : Ministère pastoral suite 3',
  'Étude livre : Les précis de la délivrance',
  'KK : Ministère pastoral suite 4',
  'LL : Ministère pastoral suite 5',
  'MM : Ministère pastoral fin',
  'Étude livre : colère',
  'PP : l’œuvre du Saint-Esprit',
  'UU : l’œuvre du Saint-Esprit suite 1',
  'VV : l’œuvre du Saint-Esprit suite 2',
  'Étude livre : orgueil',
  'YY : l’œuvre du Saint-Esprit suite 3',
  'B1B1 : l’œuvre du Saint-Esprit suite 4',
  'D1D1 : l’œuvre du Saint-Esprit suite fin',
  'Étude livre : la maladie',
  'E1E1 : Les portes d’entrées',
  'G1G1 : les portes d’entrées fin',
  'H1H1 : la démonologie',
  'Étude livre : alcool',
  'I1I1 : Devenir un gagneur d’âme',
  'J1J1 : spécialisation dans l’œuvre missionnaire',
  'K1K1 : les esprits de pauvreté et d’avarice',
  'Étude livre : Lecteur',
  'Études thématiques : les penchants de cœur',
  'N1 : Étude livre : La connaissance de JESUS le DIEU Véritable',
  'N2 : Étude livre : La connaissance de JESUS le DIEU Véritable',
]

const emptyForm = {
  class_id: '',
  chapitre: '',
  date_seance: '',
}

function getSeancesByYear(annee) {
  if (Number(annee) === 1) return SEANCES_1ERE_ANNEE
  if (Number(annee) === 2) return SEANCES_2EME_ANNEE
  if (Number(annee) === 3) return SEANCES_3EME_ANNEE
  return []
}

export default function SeancesPage({ profile }) {
  const [seances, setSeances] = useState([])
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selectedSeanceId, setSelectedSeanceId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchSeance, setSearchSeance] = useState('')
  const [message, setMessage] = useState('')
  const [selectedSeances, setSelectedSeances] = useState([])
  const [seanceSearch, setSeanceSearch] = useState('')

  const isAdmin = profile?.role === 'admin'
  const assistantClassId =
    profile?.role === 'assistant' ? profile?.class_id : null

  useEffect(() => {
    getClasses()
    getSeances()
  }, [profile])

  const finalClassId = isAdmin ? form.class_id : assistantClassId

  const selectedClass = useMemo(() => {
    return classes.find((c) => String(c.id) === String(finalClassId)) || null
  }, [classes, finalClassId])

  const filteredSeances = useMemo(() => {
    const query = searchSeance.trim().toLowerCase()

    if (!query) return seances

    return seances.filter((s) => {
      const seanceText = (s.chapitre || '').toLowerCase()
      const centre = (s.classes?.nom || '').toLowerCase()

      return seanceText.includes(query) || centre.includes(query)
    })
  }, [seances, searchSeance])

  const availableSeances = useMemo(() => {
    return getSeancesByYear(selectedClass?.annee)
  }, [selectedClass])

  const filteredAvailableSeances = useMemo(() => {
    const query = seanceSearch.trim().toLowerCase()
    if (!query) return availableSeances

    return availableSeances.filter((item) =>
      item.toLowerCase().includes(query)
    )
  }, [availableSeances, seanceSearch])

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

  async function getSeances() {
    let query = supabase
      .from('seances')
      .select(`
        *,
        classes (
          id,
          nom,
          annee
        )
      `)
      .order('created_at', { ascending: false })

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

  function handleChange(e) {
    const { name, value } = e.target

    if (name === 'class_id') {
      setSelectedSeances([])
      setSeanceSearch('')
      setForm((prev) => ({
        ...prev,
        class_id: value,
        chapitre: '',
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function toggleSeance(seance) {
    setSelectedSeances((prev) => {
      const exists = prev.includes(seance)
      const next = exists
        ? prev.filter((item) => item !== seance)
        : [...prev, seance]

      if (!exists && next.length > 4) {
        setMessage('Tu peux choisir au maximum 4 séances par jour')
        return prev
      }

      setMessage('')
      setForm((current) => ({
        ...current,
        chapitre: next.join('\n'),
      }))

      return next
    })
  }

  async function saveSeance(e) {
    e.preventDefault()
    setMessage('')

    if (!finalClassId) {
      setMessage('Choisis un centre')
      return
    }

    const seanceFinale = form.chapitre.trim()

    if (!seanceFinale) {
      setMessage('Coche la séance du jour dans la liste ci-dessus')
      return
    }

    setLoading(true)

    const payload = {
      class_id: finalClassId,
      chapitre: seanceFinale,
      date_seance: form.date_seance || new Date().toISOString().slice(0, 10),
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from('seances')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('seances')
        .insert([payload])

      error = result.error
    }

    setLoading(false)

    if (error) {
      console.log(error)
      setMessage('Erreur enregistrement séance')
      return
    }

    setMessage(editingId ? 'Séance modifiée' : 'Séance ajoutée')
    setForm(emptyForm)
    setEditingId(null)
    setSelectedSeances([])
    setSeanceSearch('')
    getSeances()
  }

  function editSeance(seance) {
    setEditingId(seance.id)

    const rawSeance = seance.chapitre || ''
    const splitSeances = rawSeance
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    setForm({
      class_id: seance.class_id || '',
      chapitre: rawSeance,
      date_seance: seance.date_seance || '',
    })

    setSelectedSeances(splitSeances)
    setSeanceSearch('')
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setSelectedSeances([])
    setSeanceSearch('')
    setMessage('')
  }

  async function deleteSeance(id) {
    const ok = window.confirm('Supprimer cette séance ?')
    if (!ok) return

    const { error } = await supabase
      .from('seances')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      setMessage('Erreur suppression séance')
      return
    }

    setMessage('Séance supprimée')
    getSeances()
  }

  function openSeance(id) {
    setSelectedSeanceId(id)
  }

  function closeSeanceDetail() {
    setSelectedSeanceId(null)
    getSeances()
  }

  if (selectedSeanceId) {
    return (
      <SeanceDetailPage
        seanceId={selectedSeanceId}
        onBack={closeSeanceDetail}
      />
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {editingId ? 'Modifier séance' : 'Séances'}
        </h2>

        <form onSubmit={saveSeance}>
          {isAdmin ? (
            <select
              style={styles.input}
              name="class_id"
              value={form.class_id}
              onChange={handleChange}
            >
              <option value="">Choisir un centre</option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.nom} - {classe.annee}e année
                </option>
              ))}
            </select>
          ) : (
            <div style={styles.infoBox}>
              Centre : {classes[0]?.nom || '-'}
            </div>
          )}

          {selectedClass && availableSeances.length > 0 ? (
            <div style={styles.chapterBox}>
              <p style={styles.chapterTitle}>
                Séances de {selectedClass.annee}e année
              </p>

              <input
                style={styles.input}
                placeholder="Rechercher une séance..."
                value={seanceSearch}
                onChange={(e) => setSeanceSearch(e.target.value)}
              />

              <p style={styles.helperText}>
                Tu peux choisir jusqu’à 4 séances par jour.
              </p>

              <div style={styles.chapterList}>
                {filteredAvailableSeances.map((seance) => (
                  <label key={seance} style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={selectedSeances.includes(seance)}
                      onChange={() => toggleSeance(seance)}
                    />
                    <span style={styles.checkboxText}>{seance}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <textarea
            style={styles.textarea}
            name="chapitre"
            placeholder="Coche la séance du jour dans la liste ci-dessus"
            value={form.chapitre}
            readOnly
          />

          <input
            style={styles.input}
            type="date"
            name="date_seance"
            value={form.date_seance}
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
              ? 'Modifier séance'
              : 'Ajouter séance'}
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
        <h3 style={styles.sectionTitle}>Liste des séances</h3>

        <input
          style={styles.input}
          placeholder="Rechercher une séance ou un centre..."
          value={searchSeance}
          onChange={(e) => setSearchSeance(e.target.value)}
        />

        {seances.length === 0 ? (
          <p>Aucune séance enregistrée.</p>
        ) : (
          filteredSeances.map((seance) => (
            <div key={seance.id} style={styles.itemCard}>
              <strong style={styles.seanceName}>{seance.chapitre}</strong>

              <p style={styles.meta}>Centre : {seance.classes?.nom || '-'}</p>
              <p style={styles.meta}>Année : {seance.classes?.annee || '-'}</p>
              <p style={styles.meta}>Date : {seance.date_seance || '-'}</p>

              <div
                style={{
                  ...styles.statusBadge,
                  ...(seance.cloturee ? styles.statusClosed : styles.statusOpen),
                }}
              >
                {seance.cloturee ? 'Clôturée' : 'Ouverte'}
              </div>

              <div style={styles.row}>
                <button
                  type="button"
                  style={styles.openButton}
                  onClick={() => openSeance(seance.id)}
                >
                  {seance.cloturee ? 'Voir séance clôturée' : 'Ouvrir séance'}
                </button>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => editSeance(seance)}
                >
                  Modifier
                </button>

                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={() => deleteSeance(seance.id)}
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
    background: '#ffffff',
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
    boxSizing: 'border-box',
    background: '#fff',
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #d8c8ef',
    fontSize: 16,
    boxSizing: 'border-box',
    background: '#fff',
    resize: 'vertical',
    whiteSpace: 'pre-wrap',
  },
  infoBox: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: '2px solid #eadcf9',
    background: '#fff7fc',
    color: '#2b0a78',
    fontWeight: 'bold',
    boxSizing: 'border-box',
  },
  chapterBox: {
    marginBottom: 12,
    borderRadius: 14,
    border: '2px solid #eadcf9',
    background: '#fbf8ff',
    padding: 14,
  },
  chapterTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: '#2b0a78',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  helperText: {
    marginTop: 0,
    marginBottom: 12,
    color: '#6f5b84',
    textAlign: 'center',
    fontSize: 14,
  },
  chapterList: {
    maxHeight: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    background: '#fff',
    border: '1px solid #eadcf9',
  },
  checkboxText: {
    color: '#333',
    lineHeight: 1.4,
  },
  itemCard: {
    border: '1px solid #eadcf9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    background: '#fff',
  },
  seanceName: {
    color: '#2b0a78',
    fontSize: 20,
    whiteSpace: 'pre-wrap',
  },
  meta: {
    margin: '6px 0',
    color: '#666',
    whiteSpace: 'pre-wrap',
  },
  row: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  openButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#7b61c9',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
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
  message: {
    marginTop: 14,
    fontWeight: 'bold',
    color: '#d4148e',
    textAlign: 'center',
    fontSize: 18,
  },
  statusBadge: {
    display: 'inline-block',
    marginTop: 10,
    marginBottom: 6,
    padding: '8px 14px',
    borderRadius: 999,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  statusOpen: {
    background: '#e8f5e9',
    color: '#1b8f3a',
    border: '1px solid #b7dfbf',
  },
  statusClosed: {
    background: '#fff4e5',
    color: '#b26a00',
    border: '1px solid #f3d19c',
  },
}
