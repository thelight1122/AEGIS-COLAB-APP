import { useContext } from 'react';
import { CommonsContext } from '../contexts/CommonsContextBase';

export function useCommons() {
    const context = useContext(CommonsContext);
    if (!context) throw new Error('useCommons must be used within CommonsProvider');
    return context;
}
