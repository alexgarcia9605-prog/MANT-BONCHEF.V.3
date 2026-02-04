import { cn } from '../../lib/utils';

export const PageHeader = ({ title, description, children, className }) => {
    return (
        <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8', className)}>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{title}</h1>
                {description && (
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
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
