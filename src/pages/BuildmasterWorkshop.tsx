import BuildmasterDashboard from '../features/buildmaster/components/BuildmasterDashboard';

export default function BuildmasterWorkshop() {
    return (
        <div className="h-full w-full bg-[#0a0f14] text-slate-100 overflow-hidden flex flex-col">
            <div className="flex-grow min-h-0">
                <BuildmasterDashboard />
            </div>
        </div>
    );
}
