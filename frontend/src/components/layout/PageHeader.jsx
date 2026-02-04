import { cn } from '../../lib/utils';

export const PageHeader = ({ title, description, children, className }) => {
    return (
        <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-muted-foreground mt-1">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
};
