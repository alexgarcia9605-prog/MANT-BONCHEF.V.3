import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { cn, formatDate, getStatusLabel, getPriorityLabel } from '../lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const navigate = useNavigate();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await axios.get(`${API}/dashboard/calendar`);
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEventsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(e => {
            if (!e.date) return false;
            const eventDate = e.date.split('T')[0];
            return eventDate === dateStr;
        });
    };

    const selectedEvents = getEventsForDate(selectedDate);

    const eventDates = events
        .filter(e => e.date)
        .map(e => new Date(e.date.split('T')[0]));

    const priorityClass = {
        critica: 'priority-critica',
        alta: 'priority-alta',
        media: 'priority-media',
        baja: 'priority-baja'
    };

    const statusClass = {
        pendiente: 'bg-gray-500/15 text-gray-700',
        en_progreso: 'bg-blue-500/15 text-blue-700',
        completada: 'bg-green-500/15 text-green-700',
        cancelada: 'bg-red-500/15 text-red-700'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="calendar-page">
            <PageHeader
                title="Calendario"
                description="Visualiza las órdenes de mantenimiento programadas"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-4">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            className="rounded-md border-0"
                            modifiers={{
                                hasEvent: eventDates
                            }}
                            modifiersStyles={{
                                hasEvent: {
                                    backgroundColor: 'rgb(249 115 22 / 0.15)',
                                    fontWeight: 'bold'
                                }
                            }}
                            data-testid="calendar"
                        />
                    </CardContent>
                </Card>

                {/* Events for Selected Date */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            {selectedDate.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No hay mantenimientos programados
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50',
                                            event.type === 'preventivo' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'
                                        )}
                                        onClick={() => navigate(`/work-orders/${event.id}`)}
                                        data-testid={`event-${event.id}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium text-sm">{event.title}</h4>
                                            <Badge className={priorityClass[event.priority]} variant="outline">
                                                {getPriorityLabel(event.priority)}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {event.machine_name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge className={event.type === 'preventivo' ? 'badge-preventivo' : 'badge-correctivo'}>
                                                {event.type === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                                            </Badge>
                                            <Badge className={statusClass[event.status]}>
                                                {getStatusLabel(event.status)}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming Events */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Mantenimientos</CardTitle>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            No hay mantenimientos programados
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Orden</th>
                                        <th>Máquina</th>
                                        <th>Tipo</th>
                                        <th>Prioridad</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events
                                        .filter(e => e.date)
                                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                                        .slice(0, 10)
                                        .map((event) => (
                                            <tr
                                                key={event.id}
                                                className="cursor-pointer"
                                                onClick={() => navigate(`/work-orders/${event.id}`)}
                                                data-testid={`upcoming-${event.id}`}
                                            >
                                                <td className="mono">{formatDate(event.date)}</td>
                                                <td className="font-medium">{event.title}</td>
                                                <td>{event.machine_name}</td>
                                                <td>
                                                    <Badge className={event.type === 'preventivo' ? 'badge-preventivo' : 'badge-correctivo'}>
                                                        {event.type === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge className={priorityClass[event.priority]}>
                                                        {getPriorityLabel(event.priority)}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge className={statusClass[event.status]}>
                                                        {getStatusLabel(event.status)}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
