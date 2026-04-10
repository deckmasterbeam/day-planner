import { useMemo, useState } from 'react'
import './App.css'

type EventData = {
  startTime: number
  endTime: number
  name: string
}

const colors = ['#4c8cff', '#53c88e', '#f2a94e', '#b56fff', '#ff6b82']
const rowHeight = 60

function App() {
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [name, setName] = useState('')
  const [eventMap, setEventMap] = useState<Record<number, EventData>>({})
  const [eventCounter, setEventCounter] = useState(1)
  const [editingEvent, setEditingEvent] = useState<number | undefined>(undefined)
  const today = new Date()

  const eventList = useMemo(
    () =>
      Object.entries(eventMap)
        .map(([key, event]) => ({
          id: Number(key),
          ...event,
        }))
        .sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime),
    [eventMap],
  )

  const eventBlocks = useMemo(() => {
    const activeColumns: Array<{ event: EventData & { id: number }; column: number }> = []
    const layout = eventList.map((event) => {
      for (let i = activeColumns.length - 1; i >= 0; i -= 1) {
        if (activeColumns[i].event.endTime <= event.startTime) {
          activeColumns.splice(i, 1)
        }
      }

      const usedColumns = new Set(activeColumns.map((item) => item.column))
      let column = 0
      while (usedColumns.has(column)) {
        column += 1
      }
      activeColumns.push({ event, column })

      return {
        ...event,
        column,
        columns: 1,
      }
    })

    const hourCounts = Array.from({ length: 24 }, () => 0)
    eventList.forEach((event) => {
      for (let hour = event.startTime; hour < event.endTime; hour += 1) {
        if (hour >= 1 && hour <= 24) {
          hourCounts[hour - 1] += 1
        }
      }
    })

    return layout.map((item) => {
      const startIndex = Math.max(0, item.startTime - 1)
      const endIndex = Math.min(24, item.endTime) - 1
      const concurrentCount =
        startIndex <= endIndex
          ? Math.max(1, ...hourCounts.slice(startIndex, endIndex + 1))
          : 1
      return {
        ...item,
        columns: concurrentCount,
      }
    })
  }, [eventList])

  const isValidTimeRange = (start: number, end: number) =>
    Number.isFinite(start) && Number.isFinite(end) && start >= 1 && end <= 24 && start < end

  const isSaveDisabled = useMemo(() => {
    const start = Number(startTime)
    const end = Number(endTime)
    const trimmedName = name.trim()

    if (!trimmedName || !isValidTimeRange(start, end)) {
      return true
    }

    if (editingEvent !== undefined) {
      const original = eventMap[editingEvent]
      if (!original) {
        return true
      }
      return (
        original.name === trimmedName &&
        original.startTime === start &&
        original.endTime === end
      )
    }

    return false
  }, [editingEvent, endTime, eventMap, name, startTime])

  const handleSaveButtonClick = () => {
    const start = Number(startTime)
    const end = Number(endTime)
    const trimmedName = name.trim()

    if (!trimmedName || !isValidTimeRange(start, end)) {
      alert('Enter a valid name and a time range from 1 to 24 with start < end.')
      return
    }

    const eventId = editingEvent !== undefined ? editingEvent : eventCounter
    setEventMap((prev) => ({
      ...prev,
      [eventId]: {
        startTime: start,
        endTime: end,
        name: trimmedName,
      },
    }))

    if (editingEvent === undefined) {
      setEventCounter((prev) => prev + 1)
    }

    setStartTime('')
    setEndTime('')
    setName('')
    setEditingEvent(undefined)
  }

  const handleExitEditing = () => {
    setEditingEvent(undefined)
    setName('')
    setStartTime('')
    setEndTime('')
  }

  const handleDelete = () => {
    if (editingEvent === undefined) {
      return
    }

    setEventMap((prev) => {
      const next = { ...prev }
      delete next[editingEvent]
      return next
    })

    handleExitEditing();
  }

  const handleSetEditing = (eventId: number) => {
    const event = eventMap[eventId]
    if (!event) {
      return
    }

    setEditingEvent(eventId)
    setName(event.name)
    setStartTime(String(event.startTime))
    setEndTime(String(event.endTime))
  }

  const hours = Array.from({ length: 24 }, (_, index) => index + 1)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Day Planner</h1>
          <p>{today.toLocaleDateString()}</p>
        </div>
      </header>

      <form className="event-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-row">
          <label htmlFor="start-time">Start Time</label>
          <input
            id="start-time"
            value={startTime}
            type="number"
            min={1}
            max={24}
            placeholder="1 ... 24"
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label htmlFor="end-time">End Time</label>
          <input
            id="end-time"
            value={endTime}
            type="number"
            min={1}
            max={24}
            placeholder="1 ... 24"
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="form-row form-row--full">
          <label htmlFor="event-name">Event Name</label>
          <input
            id="event-name"
            value={name}
            placeholder="Meeting, Workout, Lunch..."
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className={`${isSaveDisabled ? 'disabled-button' : 'enabled-button'}`} onClick={handleSaveButtonClick} disabled={isSaveDisabled}>
            {editingEvent !== undefined ? 'Update Event' : 'Save Event'}
          </button>
          {editingEvent !== undefined && (
            <button type="button" onClick={handleExitEditing}>
              Cancel
            </button>
          )}
          {editingEvent !== undefined && (
            <button type="button" className='delete-button' onClick={handleDelete}>
              Delete Event
            </button>
          )}
        </div>
      </form>

      <section className="calendar-shell">
        <div className="calendar-grid">
          {hours.map((hour) => (
            <div key={hour} className="hour-row" onClick={() => setStartTime(String(hour))}>
              <span className="hour-label">{String(hour).padStart(2, '0')}:00</span>
            </div>
          ))}
          <div className="events-layer">
            {eventBlocks.map((event) => {
              const top = (event.startTime - 1) * rowHeight
              const height = (event.endTime - event.startTime) * rowHeight - 10
              const width = 100 / event.columns
              const left = (event.column * 100) / event.columns

              return (
                <button
                  key={event.id}
                  type="button"
                  className="event-card"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    width: `calc(${width}% - 10px)`,
                    left: `calc(${left}% + 5px)`,
                    backgroundColor: colors[event.id % colors.length],
                  }}
                  onClick={() => handleSetEditing(event.id)}
                >
                  <span className="event-title">{event.name}</span>
                  <span className="event-time">
                    {event.startTime}:00 - {event.endTime}:00
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
