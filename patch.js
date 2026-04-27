const fs = require('fs');
let code = fs.readFileSync('components/InteractiveCalendar.tsx', 'utf8');

code = code.replace(
  'const { properties, bookings, maintenanceTasks, updateProperty } = useBNB();',
  'const { properties, bookings, maintenanceTasks, updateProperty, updateBooking } = useBNB();'
);

const anchor1 = 'const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);';
const insertion1 = \
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  const handleEventDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }, 0);
  };

  const handleEventDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedEvent) return;

    if (draggedEvent.type === 'booking') {
      const b = draggedEvent.data as Booking;
      const originalStart = parseISO(b.checkIn);
      const originalEnd = parseISO(b.checkOut);
      const diffDays = differenceInDays(targetDate, originalStart);

      if (diffDays !== 0) {
        const newStart = addDays(originalStart, diffDays);
        const newEnd = addDays(originalEnd, diffDays);
        
        updateBooking(b.id, {
          checkIn: format(newStart, 'yyyy-MM-dd'),
          checkOut: format(newEnd, 'yyyy-MM-dd')
        });

        // Backend
        fetch(\/api/bookings/\\, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: format(newStart, 'yyyy-MM-dd'),
            checkOut: format(newEnd, 'yyyy-MM-dd')
          })
        }).catch(err => console.error("Error updating booking:", err));
      }
    }
    setDraggedEvent(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
\;
code = code.replace(anchor1, anchor1 + '\\n' + insertion1);

const mContainerOld = '                      onMouseEnter={() => handleMouseEnter(day)}>';
const mContainerNew = \                      onMouseEnter={() => handleMouseEnter(day)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleEventDrop(e, day)}>\;
code = code.replace(mContainerOld, mContainerNew);

const mItemOld = '                            onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}';  
const mItemNew = \                            draggable={ev.type === 'booking'}
                            onDragStart={(e) => handleEventDragStart(e, ev)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}\;
code = code.replace(mItemOld, mItemNew);

const wContainerOld = '                      <div key={idx} onClick={() => setSelectedDate(day)}\\n                        className=';
const wContainerNew = \                      <div key={idx} onClick={() => setSelectedDate(day)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleEventDrop(e, day)}
                        className=\;
code = code.replace(wContainerOld, wContainerNew);

fs.writeFileSync('components/InteractiveCalendar.tsx', code);
console.log('done patch');
