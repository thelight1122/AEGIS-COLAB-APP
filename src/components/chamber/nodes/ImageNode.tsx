import { BaseNode } from './BaseNode';

interface ImageNodeProps {
    data: {
        label?: string;
        imageUrl?: string;
        alt?: string;
    };
    selected?: boolean;
}

export function ImageNode({ data, selected }: ImageNodeProps) {
    const fallbackImage = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80"; // Abstract gradient fallback

    return (
        <BaseNode selected={selected} label={data.label} noPadding className="p-0 overflow-hidden min-w-[200px] max-w-[300px]">
            <div className="relative group">
                <img 
                    src={data.imageUrl || fallbackImage} 
                    alt={data.alt || data.label || "Canvas Image"} 
                    className="w-full h-auto object-cover aspect-video bg-muted/20"
                    loading="lazy"
                />
                
                {!data.imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-medium">
                        No Image URL
                    </div>
                )}
            </div>
        </BaseNode>
    );
}
