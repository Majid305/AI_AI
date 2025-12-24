
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getAllDocuments } from '../services/db';
import { DocumentData, DocStatus } from '../types';
import React, { useEffect, useState } from 'react';

// Fixed errors: removed DocLanguage, used nature_incident, fixed DocStatus.TRAITE, and removed language stats
export const Statistics = () => {
    const [stats, setStats] = useState<{
        statusData: any[],
        typeData: any[],
        total: number
    }>({ statusData: [], typeData: [], total: 0 });

    useEffect(() => {
        calculateStats();
    }, []);

    const calculateStats = async () => {
        const docs = await getAllDocuments();
        
        // Status Distribution - Fix: Use DocStatus properties defined in types.ts
        // Fixed: Property 'CLASSE' does not exist on type 'typeof DocStatus'. Did you mean 'CLASSER'?
        const traitesCount = docs.filter(d => d.statut === DocStatus.CLASSER).length;
        // Fixed: Property 'A_SUIVRE' does not exist on type 'typeof DocStatus'. Did you mean 'SUIVRE'?
        const enCoursCount = docs.filter(d => d.statut === DocStatus.SUIVRE).length;
        
        const statusData = [
            { name: 'Classés', value: traitesCount, color: '#00C979' },
            { name: 'À suivre', value: enCoursCount, color: '#FF6600' }
        ];

        // Type Distribution (Top 5) - Fix: Use nature_incident instead of type_objet
        const typeMap: Record<string, number> = {};

        docs.forEach(d => {
            const t = d.nature_incident || "Autre";
            typeMap[t] = (typeMap[t] || 0) + 1;
        });

        const typeData = Object.entries(typeMap)
            .map(([name, value]) => ({ name: name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        setStats({ statusData, typeData, total: docs.length });
    };

    return (
        <div className="h-full bg-gray-50 dark:bg-slate-950 overflow-y-auto p-4 pb-24 transition-colors duration-300">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Statistiques</h2>
            
            <div className="grid gap-6">
                {/* Global KPI */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm text-center border border-transparent dark:border-slate-800">
                    <span className="text-4xl font-bold text-[#0ABAB5]">{stats.total}</span>
                    <p className="text-gray-500 dark:text-gray-400 uppercase text-xs font-bold mt-2">Incidents Total</p>
                </div>

                {/* Pie Chart */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm h-72 border border-transparent dark:border-slate-800">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">État des dossiers</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none', color: '#fff'}}/>
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm h-72 border border-transparent dark:border-slate-800">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Top Natures d'Incident</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.typeData}>
                            <XAxis dataKey="name" fontSize={10} tick={{fill: '#9ca3af'}} interval={0} angle={-25} textAnchor="end" height={60} />
                            <YAxis fontSize={10} tick={{fill: '#9ca3af'}} allowDecimals={false}/>
                            <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none', color: '#fff'}}/>
                            <Bar dataKey="value" fill="#0ABAB5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
