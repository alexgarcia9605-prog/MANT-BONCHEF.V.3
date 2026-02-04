import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getStatusLabel = (status) => {
    const labels = {
        pendiente: 'Pendiente',
        en_progreso: 'En Progreso',
        completada: 'Completada',
        cancelada: 'Cancelada',
        pospuesta: 'Pospuesta',
        cerrada_parcial: 'Cerrada Parcial'
    };
    return labels[status] || status;
};

export const getPriorityLabel = (priority) => {
    const labels = {
        baja: 'Baja',
        media: 'Media',
        alta: 'Alta',
        critica: 'Crítica'
    };
    return labels[priority] || priority;
};

export const getTypeLabel = (type) => {
    const labels = {
        preventivo: 'Preventivo',
        correctivo: 'Correctivo'
    };
    return labels[type] || type;
};

export const getMachineStatusLabel = (status) => {
    const labels = {
        operativa: 'Operativa',
        en_mantenimiento: 'En Mantenimiento',
        fuera_de_servicio: 'Fuera de Servicio'
    };
    return labels[status] || status;
};

export const getRoleLabel = (role) => {
    const labels = {
        admin: 'Administrador',
        supervisor: 'Supervisor',
        tecnico: 'Técnico',
        encargado_linea: 'Encargado Línea'
    };
    return labels[role] || role;
};

export const getRecurrenceLabel = (recurrence) => {
    const labels = {
        diario: 'Diario',
        semanal: 'Semanal',
        mensual: 'Mensual',
        trimestral: 'Trimestral',
        anual: 'Anual'
    };
    return labels[recurrence] || recurrence;
};

export const getFailureCauseLabel = (cause) => {
    const labels = {
        accidente: 'Accidente',
        mala_utilizacion: 'Mala utilización',
        instruccion_no_respetada: 'Instrucción no respetada',
        mala_intervencion_anterior: 'Mala intervención anterior',
        fatiga_acumulada: 'Fatiga acumulada',
        golpe: 'Golpe',
        diseno_inadecuado: 'Diseño inadecuado',
        desgaste: 'Desgaste',
        mal_montaje: 'Mal montaje',
        corrosion: 'Corrosión',
        otros: 'Otros'
    };
    return labels[cause] || cause;
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
