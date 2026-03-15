import { useState, useMemo, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

export function Sidebar({
  topologyData,
  hiddenNodes,
  setHiddenNodes,
  showAutoFlow,
  setShowAutoFlow,
  activeRules,
  setActiveRules,
  onAddGlobal,
  onSelectItem,
  hiddenRules = {},
  setHiddenRules,
  ruleConflicts = {}
}: any) {
  const toggleRuleVisibility = (ruleId: string, e: any) => {
    e.stopPropagation()
    if (setHiddenRules) {
      setHiddenRules((prev: any) => ({
        ...prev,
        [ruleId]: !prev[ruleId]
      }))
    }
  }
  const toggleVisibility = (id: string) => {
    setHiddenNodes((prev: any) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const toggleRule = (ruleId: string) => {
    setActiveRules((prev: any) => 
      prev.map((r: any) => r.id === ruleId ? { ...r, active: !r.active } : r)
    )
  }

  const [searchQuery, setSearchQuery] = useState('')

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const savedSort = localStorage.getItem('firewallSortOrder')
    if (savedSort === 'asc' || savedSort === 'desc') {
      setSortOrder(savedSort)
    }
  }, [])

  const toggleSortOrder = () => {
    setSortOrder(prev => {
      const newSort = prev === 'asc' ? 'desc' : 'asc'
      localStorage.setItem('firewallSortOrder', newSort)
      return newSort
    })
  }

  const sortedRules = useMemo(() => {
    return [...activeRules].sort((a: any, b: any) => {
      const pA = a.priority ?? 100;
      const pB = b.priority ?? 100;
      return sortOrder === 'asc' ? pA - pB : pB - pA;
    });
  }, [activeRules, sortOrder])

  const filteredZones = useMemo(() => {
    if (!searchQuery) return topologyData.zones;
    const q = searchQuery.toLowerCase();

    return topologyData.zones?.map((zone: any) => {
      const matchesZone = zone.name.toLowerCase().includes(q);
      
      const filteredNetworks = zone.networks.map((net: any) => {
        const matchesNet = net.name.toLowerCase().includes(q);
        const filteredClients = net.clients.filter((c: any) => 
          c.name.toLowerCase().includes(q) || (c.ip && c.ip.toLowerCase().includes(q))
        );
        
        if (matchesZone || matchesNet || filteredClients.length > 0) {
          return {
            ...net,
            clients: filteredClients.length > 0 ? filteredClients : net.clients
          };
        }
        return null;
      }).filter(Boolean);

      if (matchesZone || filteredNetworks.length > 0) {
        return {
          ...zone,
          networks: filteredNetworks.length > 0 ? filteredNetworks : zone.networks
        };
      }
      return null;
    }).filter(Boolean);
  }, [topologyData.zones, searchQuery]);

  return (
    <div className="w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto flex flex-col transition-colors">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Network Flow Visualizer</h2>
        </div>
        <ThemeToggle />
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <label className="flex items-center gap-2 cursor-pointer bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
          <input 
            type="checkbox" 
            checked={showAutoFlow} 
            onChange={(e) => setShowAutoFlow(e.target.checked)} 
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="font-medium text-sm text-blue-900 dark:text-blue-300">Show Open Paths (Auto-Flow)</span>
        </label>
      </div>

      <div className="flex-1 p-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm tracking-wider uppercase">Topology Filter</h3>
        
        <input 
          type="text" 
          placeholder="Search nodes, IPs..." 
          className="w-full text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {filteredZones?.map((zone: any) => (
          <div key={zone.id} className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800 dark:text-gray-200">
              <input 
                type="checkbox" 
                checked={!hiddenNodes[zone.id]} 
                onChange={() => toggleVisibility(zone.id)}
                className="w-4 h-4"
              />
              <span 
                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                onClick={(e) => { e.preventDefault(); onSelectItem?.({ id: zone.id, type: 'ZoneNode', data: { label: zone.name, color: zone.color, borderColor: zone.borderColor, description: zone.description } }) }}
              >
                {zone.name}
              </span>
            </label>
            
            {!hiddenNodes[zone.id] && (
              <div className="ml-6 mt-1 flex flex-col gap-1">
                {zone.networks.map((net: any) => (
                  <div key={net.id}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                      <input 
                        type="checkbox" 
                        checked={!hiddenNodes[net.id]} 
                        onChange={() => toggleVisibility(net.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span 
                        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                        onClick={(e) => { e.preventDefault(); onSelectItem?.({ id: net.id, type: 'NetworkNode', data: { label: net.name, cidr: net.cidr, color: net.color, description: net.description, clientIsolation: net.clientIsolation } }) }}
                      >
                        {net.name}
                      </span>
                    </label>
                    
                    {!hiddenNodes[net.id] && (
                      <div className="ml-6 mt-1 flex flex-col gap-1">
                        {net.clients.map((client: any) => (
                          <label key={client.id} className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 dark:text-gray-400">
                            <input 
                              type="checkbox" 
                              checked={!hiddenNodes[client.id]} 
                              onChange={() => toggleVisibility(client.id)}
                              className="w-3 h-3"
                            />
                            <span 
                              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                              onClick={(e) => { e.preventDefault(); onSelectItem?.({ id: client.id, type: 'ClientNode', data: { label: client.name, ip: client.ip, color: client.color, description: client.description } }) }}
                            >
                              {client.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm tracking-wider uppercase mb-0">Rules Simulation</h3>
            <button 
              onClick={toggleSortOrder}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition flex items-center gap-1 font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded"
              title={sortOrder === 'asc' ? "Lowest Priority First" : "Highest Priority First"}
            >
              {sortOrder === 'asc' ? '↓ Pri' : '↑ Pri'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {sortedRules.map((r: any) => {
              const conflict = ruleConflicts[r.id];
              const isFullyShadowed = conflict?.isFullyShadowed;
              const isPartiallyShadowed = conflict?.shadowedPorts?.length > 0 && !isFullyShadowed;

              return (
              <div key={r.id} className={`p-2 rounded-md text-sm border ${
                  isFullyShadowed 
                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60' 
                    : r.action === 'BLOCK' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30' 
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                } flex items-start flex-col cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => onSelectItem?.({ id: r.id, type: 'RuleEdge', data: r })}
              >
                <div className="flex items-center justify-between w-full">
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={(e) => toggleRuleVisibility(r.id, e)}
                       className="text-gray-400 hover:text-gray-700 transition-colors"
                       title={hiddenRules[r.id] ? "Show rule purely visually in graph" : "Hide rule purely visually from graph"}
                     >
                       {hiddenRules[r.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                     </button>
                     <span className={`font-medium text-gray-900 dark:text-gray-100 ${hiddenRules[r.id] ? 'opacity-50' : ''} flex items-center gap-1`}>
                       {r.description || r.action}
                       {isFullyShadowed && (
                         <div className="relative group inline-flex" title={`Conflict: ${conflict.shadowingRuleNames.join(', ')}`}>
                           <AlertCircle className="w-3.5 h-3.5 text-red-500 cursor-help" />
                           <div className="absolute top-full left-0 mt-1 hidden group-hover:block w-max bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 whitespace-normal max-w-xs font-normal shadow-lg">
                             Conflict: {conflict.shadowingRuleNames.join(', ')}
                           </div>
                         </div>
                       )}
                     </span>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="sr-only peer" checked={r.active} onChange={() => toggleRule(r.id)} />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  Ports: {r.ports} 
                  {isPartiallyShadowed && (
                    <div className="relative group inline-flex">
                      <AlertCircle className="w-3 h-3 text-amber-500 cursor-help" />
                      <div className="absolute top-full left-0 mt-1 hidden group-hover:block w-max bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 whitespace-normal max-w-xs font-normal shadow-lg">
                        Conflict: {conflict.shadowingRuleNames.join(', ')} covers {conflict.shadowedPorts.join(', ')}
                      </div>
                    </div>
                  )}
                  | Pri: {r.priority}
                </div>
              </div>
            )})}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4 pb-8">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm tracking-wider uppercase">Management</h3>
          <div className="flex gap-2">
            <button onClick={() => onAddGlobal('ZoneNode')} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 transition font-medium">
              + New Zone
            </button>
            <button onClick={() => onAddGlobal('RuleEdge')} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 transition font-medium">
              + New Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
