import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { RefreshCw, Eye, Code, GitBranch, Activity, Database } from 'lucide-react';
import axios from 'axios';

interface Persona {
    slug: string;
    name: string;
    role: string;
    personality: string;
    private_knowledge: string;
    shared_knowledge: string;
    knows_about_others: string;
    clue_keywords?: string[];
}

interface AgentInfo {
    slug: string;
    name: string;
    role: string;
    clue_keywords: string[];
}

interface GraphData {
    mermaid: string;
    nodes: Array<{id: string; label: string; type: string}>;
    edges: Array<{from: string; to: string; label: string}>;
}

export default function Debug() {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'knowledge' | 'graph' | 'state'>('knowledge');
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [agentsInfo, setAgentsInfo] = useState<{agents: AgentInfo[]; multi_agent_enabled: boolean} | null>(null);
    const [gameId, setGameId] = useState<string>('');
    const [gameState, setGameState] = useState<any>(null);

    useEffect(() => {
        loadPersonas();
        loadGraph();
        loadAgentsInfo();
    }, []);

    const loadPersonas = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/debug/personas');
            setPersonas(response.data.personas);
        } catch (error) {
            console.error('Failed to load personas:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadGraph = async () => {
        try {
            const response = await axios.get('http://localhost:8001/debug/graph');
            setGraphData(response.data);
        } catch (error) {
            console.error('Failed to load graph:', error);
        }
    };

    const loadAgentsInfo = async () => {
        try {
            const response = await axios.get('http://localhost:8001/debug/agents');
            setAgentsInfo(response.data);
        } catch (error) {
            console.error('Failed to load agents info:', error);
        }
    };

    const loadGameState = async () => {
        if (!gameId) return;
        try {
            const response = await axios.get(`http://localhost:8001/debug/game/${gameId}/state`);
            setGameState(response.data);
        } catch (error: any) {
            setGameState({ error: error.response?.data?.detail || 'Game not found' });
        }
    };

    const selected = personas.find(p => p.slug === selectedPersona);

    return (
        <>
            <Head title="Debug Dashboard - Multi-Agent" />
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-red-400 flex items-center gap-3">
                                🔍 Multi-Agent Debug Dashboard
                                {agentsInfo?.multi_agent_enabled && (
                                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                                        Multi-Agent Active
                                    </span>
                                )}
                            </h1>
                            <p className="text-slate-400 mt-1">
                                LangGraph Visualization, Agent Knowledge & Game State
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => { loadPersonas(); loadGraph(); loadAgentsInfo(); }}
                                variant="outline"
                                className="border-slate-700 text-slate-300"
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <a href="/game">
                                <Button className="bg-red-700 hover:bg-red-600">
                                    Back to Game
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('knowledge')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                activeTab === 'knowledge' 
                                    ? 'bg-red-900/50 text-red-100 border border-red-500/50' 
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                            }`}
                        >
                            <Database className="h-4 w-4" />
                            Agent Knowledge
                        </button>
                        <button
                            onClick={() => setActiveTab('graph')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                activeTab === 'graph' 
                                    ? 'bg-red-900/50 text-red-100 border border-red-500/50' 
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                            }`}
                        >
                            <GitBranch className="h-4 w-4" />
                            LangGraph Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('state')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                                activeTab === 'state' 
                                    ? 'bg-red-900/50 text-red-100 border border-red-500/50' 
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
                            }`}
                        >
                            <Activity className="h-4 w-4" />
                            Game State
                        </button>
                    </div>

                    {/* Knowledge Tab */}
                    {activeTab === 'knowledge' && (
                        <div className="grid grid-cols-12 gap-6">
                            {/* Sidebar - Persona List */}
                            <div className="col-span-3">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-lg text-slate-200">Agents ({personas.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {personas.map(persona => (
                                            <button
                                                key={persona.slug}
                                                onClick={() => setSelectedPersona(persona.slug)}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                    selectedPersona === persona.slug
                                                        ? 'bg-red-900/50 border-red-500 border'
                                                        : 'bg-slate-800 hover:bg-slate-750 border border-slate-700'
                                                }`}
                                            >
                                                <div className="font-medium text-slate-200">{persona.name}</div>
                                                <div className="text-sm text-slate-400">{persona.role}</div>
                                                <div className="text-xs text-slate-500 mt-1 font-mono">{persona.slug}</div>
                                            </button>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content - Persona Details */}
                            <div className="col-span-9">
                                {selected ? (
                                    <div className="space-y-4">
                                        {/* Personality */}
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardHeader>
                                                <CardTitle className="text-red-400 flex items-center gap-2">
                                                    <Eye className="h-5 w-5" />
                                                    Personality Prompt
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-4 rounded border border-slate-800 max-h-48 overflow-auto">
                                                    {selected.personality}
                                                </pre>
                                            </CardContent>
                                        </Card>

                                        {/* Private Knowledge */}
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardHeader>
                                                <CardTitle className="text-orange-400 flex items-center gap-2">
                                                    <Code className="h-5 w-5" />
                                                    Private Knowledge (ONLY this agent sees this!)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-4 rounded border border-orange-900/50 max-h-64 overflow-auto">
                                                    {selected.private_knowledge}
                                                </pre>
                                            </CardContent>
                                        </Card>

                                        {/* Shared Knowledge */}
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardHeader>
                                                <CardTitle className="text-blue-400 flex items-center gap-2">
                                                    <Eye className="h-5 w-5" />
                                                    Shared Knowledge (ALL agents see this)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-4 rounded border border-blue-900/50 max-h-48 overflow-auto">
                                                    {selected.shared_knowledge}
                                                </pre>
                                            </CardContent>
                                        </Card>

                                        {/* Clue Keywords */}
                                        {selected.clue_keywords && selected.clue_keywords.length > 0 && (
                                            <Card className="bg-slate-900 border-slate-800">
                                                <CardHeader>
                                                    <CardTitle className="text-yellow-400 flex items-center gap-2">
                                                        🔑 Clue Detection Keywords
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selected.clue_keywords.map((kw, i) => (
                                                            <span key={i} className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-sm border border-yellow-700/50">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                ) : (
                                    <Card className="bg-slate-900 border-slate-800 h-64 flex items-center justify-center">
                                        <CardContent className="text-center text-slate-400">
                                            <div className="text-4xl mb-4">👈</div>
                                            <p>Select an agent to view their knowledge</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Graph Tab */}
                    {activeTab === 'graph' && (
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-8">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 flex items-center gap-2">
                                            <GitBranch className="h-5 w-5" />
                                            LangGraph Flow Diagram
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {graphData ? (
                                            <div className="bg-slate-950 p-6 rounded border border-slate-800">
                                                {/* Visual representation */}
                                                <div className="flex flex-col items-center gap-4">
                                                    {/* Start */}
                                                    <div className="px-4 py-2 bg-blue-900/50 rounded-full border border-blue-500 text-blue-200">
                                                        START
                                                    </div>
                                                    <div className="text-slate-500">↓</div>
                                                    
                                                    {/* Router */}
                                                    <div className="px-6 py-3 bg-purple-900/50 rounded-lg border-2 border-purple-500 text-purple-200 font-semibold">
                                                        🎯 ROUTER
                                                    </div>
                                                    
                                                    {/* Arrows to agents */}
                                                    <div className="flex items-center gap-8 text-slate-500">
                                                        <span>↙</span>
                                                        <span>↓</span>
                                                        <span>↓</span>
                                                        <span>↘</span>
                                                    </div>
                                                    
                                                    {/* Agent nodes */}
                                                    <div className="flex gap-4">
                                                        {graphData.nodes.filter(n => n.type === 'persona').map(node => (
                                                            <div key={node.id} className="px-4 py-3 bg-green-900/50 rounded-lg border border-green-500 text-green-200 text-center min-w-24">
                                                                <div className="text-lg mb-1">
                                                                    {node.id === 'elena' && '🏢'}
                                                                    {node.id === 'tom' && '💻'}
                                                                    {node.id === 'lisa' && '📋'}
                                                                    {node.id === 'klaus' && '🔧'}
                                                                </div>
                                                                <div className="text-xs">{node.label.split('\n')[0]}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Arrows to end */}
                                                    <div className="flex items-center gap-8 text-slate-500">
                                                        <span>↘</span>
                                                        <span>↓</span>
                                                        <span>↓</span>
                                                        <span>↙</span>
                                                    </div>
                                                    
                                                    {/* End */}
                                                    <div className="px-4 py-2 bg-red-900/50 rounded-full border border-red-500 text-red-200">
                                                        END
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-slate-400 py-12">
                                                Loading graph...
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="col-span-4">
                                <Card className="bg-slate-900 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-200">Graph Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Nodes</div>
                                            <div className="space-y-1">
                                                {agentsInfo?.graph_nodes.map(node => (
                                                    <div key={node} className="text-sm text-slate-300 font-mono bg-slate-800 px-2 py-1 rounded">
                                                        {node}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Flow</div>
                                            <div className="text-sm text-slate-300">
                                                START → Router → Selected Persona → END
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Routing Logic</div>
                                            <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded font-mono">
                                                state["selected_persona"] → route to agent node
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* State Tab */}
                    {activeTab === 'state' && (
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-200">Load Game State</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            value={gameId}
                                            onChange={(e) => setGameId(e.target.value)}
                                            placeholder="Enter Game ID (UUID)"
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-200 placeholder-slate-500"
                                        />
                                        <Button onClick={loadGameState} className="bg-red-700 hover:bg-red-600">
                                            Load State
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {gameState && (
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Agent States */}
                                    <Card className="bg-slate-900 border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-orange-400">Agent Dynamic States</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {gameState.agent_states ? (
                                                <div className="space-y-4">
                                                    {Object.entries(gameState.agent_states).map(([slug, state]: [string, any]) => (
                                                        <div key={slug} className="bg-slate-800 rounded p-3">
                                                            <div className="font-medium text-slate-200 mb-2">{slug}</div>
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div>
                                                                    <span className="text-slate-400">Stress:</span>
                                                                    <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                                                                        <div 
                                                                            className="bg-red-500 h-2 rounded-full" 
                                                                            style={{width: `${(state.stress_level || 0) * 100}%`}}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-400">Interrogations:</span>
                                                                    <span className="text-slate-200 ml-2">{state.interrogation_count || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <pre className="text-sm text-red-400">{JSON.stringify(gameState, null, 2)}</pre>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Revealed Clues */}
                                    <Card className="bg-slate-900 border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-yellow-400">Revealed Clues</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {gameState.revealed_clues && gameState.revealed_clues.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {gameState.revealed_clues.map((clue: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                            <span className="text-yellow-500">🔍</span>
                                                            {clue}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="text-slate-400 text-sm">No clues revealed yet</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
