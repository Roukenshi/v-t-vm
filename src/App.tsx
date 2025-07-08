import React, { useState } from 'react';
import { Play, AlertCircle, CheckCircle, Terminal, Settings, Cpu, HardDrive } from 'lucide-react';
import './App.css';

function App() {
    const [boxName, setBoxName] = useState("ubuntu/bionic64");
    const [vmName, setVmName] = useState("test-vm");
    const [cpus, setCpus] = useState(2);
    const [memory, setMemory] = useState(2048);
    const [logs, setLogs] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [currentStep, setCurrentStep] = useState("");

    const addLog = (level, message) => {
        const newLog = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
        };
        setLogs(prev => [...prev, newLog]);
    };

    const createVM = async () => {
        setIsCreating(true);
        setLogs([]);

        try {
            addLog('info', 'Starting VM creation process...');
            addLog('warning', 'Checking for common issues...');

            // Validate box name
            if (boxName.includes(' ')) {
                addLog('warning', 'Box name contains spaces - this might cause issues!');
            }

            setCurrentStep('Initializing');

            const response = await fetch('http://127.0.0.1:8000/create-vm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    box_name: boxName,
                    vm_name: vmName,
                    cpus: cpus,
                    memory: memory
                })
            });

            const result = await response.json();

            if (response.ok) {
                addLog('success', 'VM created successfully!');
                addLog('info', `Terraform init output: ${result.terraform_init}`);
                addLog('info', `Terraform apply output: ${result.terraform_apply}`);
            } else {
                addLog('error', `Error: ${result.detail}`);

                // Analyze the error for common issues
                if (result.detail.includes('Virtual Box')) {
                    addLog('warning', 'DETECTED: Box name corruption - "Virtual Box" found instead of your specified box name');
                }
                if (result.detail.includes('Time') && result.detail.includes('not defined')) {
                    addLog('warning', 'DETECTED: Ruby syntax in Python f-string - Time.now.to_i is Ruby, not Python');
                }
                if (result.detail.includes('bad URI')) {
                    addLog('warning', 'DETECTED: Path/URI issue - likely caused by spaces in paths or box names');
                }
            }
        } catch (error) {
            addLog('error', `Network error: ${error}`);
        } finally {
            setIsCreating(false);
            setCurrentStep('');
        }
    };

    const getLogIcon = (level) => {
        switch (level) {
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return <Terminal className="w-4 h-4 text-blue-500" />;
        }
    };

    const getLogColor = (level) => {
        switch (level) {
            case 'error': return 'text-red-700 bg-red-50 border-red-200';
            case 'success': return 'text-green-700 bg-green-50 border-green-200';
            case 'warning': return 'text-amber-700 bg-amber-50 border-amber-200';
            default: return 'text-blue-700 bg-blue-50 border-blue-200';
        }
    };

    const popularBoxes = [
        'ubuntu/bionic64',
        'ubuntu/focal64',
        'ubuntu/jammy64',
        'centos/7',
        'generic/ubuntu2004',
        'hashicorp/bionic64'
    ];

    return (
        <div className="min-h-screen professional-bg">
            {/* Animated background elements */}
            <div className="bg-effects">
                <div className="subtle-effect effect-1"></div>
                <div className="subtle-effect effect-2"></div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="header-section">
                    <div className="header-icons">
                        <div className="icon-wrapper">
                            <Settings className="header-icon" />
                        </div>
                        <h1 className="main-title">VM Creation Debugger</h1>
                        <div className="icon-wrapper">
                            <Terminal className="header-icon" />
                        </div>
                    </div>
                    <p className="subtitle">Professional Vagrant + Terraform VM Automation Interface</p>
                    <div className="title-underline"></div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Configuration Panel */}
                    <div className="config-panel">
                        <div className="panel-header">
                            <div className="panel-icon">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="panel-title">VM Configuration</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="input-label">
                                    Vagrant Box Name
                                </label>
                                <input
                                    type="text"
                                    value={boxName}
                                    onChange={(e) => setBoxName(e.target.value)}
                                    className="professional-input"
                                    placeholder="ubuntu/bionic64"
                                />
                                <div className="popular-boxes">
                                    <p className="popular-label">Popular boxes:</p>
                                    <div className="box-buttons">
                                        {popularBoxes.map((box) => (
                                            <button
                                                key={box}
                                                onClick={() => setBoxName(box)}
                                                className="box-button"
                                            >
                                                {box}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="input-label">
                                    VM Name
                                </label>
                                <input
                                    type="text"
                                    value={vmName}
                                    onChange={(e) => setVmName(e.target.value)}
                                    className="professional-input"
                                    placeholder="my-test-vm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">
                                        <Cpu className="w-4 h-4 inline mr-1" />
                                        CPUs
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={cpus}
                                        onChange={(e) => setCpus(parseInt(e.target.value))}
                                        className="professional-input"
                                    />
                                </div>

                                <div>
                                    <label className="input-label">
                                        <HardDrive className="w-4 h-4 inline mr-1" />
                                        Memory (MB)
                                    </label>
                                    <input
                                        type="number"
                                        min="512"
                                        max="8192"
                                        step="512"
                                        value={memory}
                                        onChange={(e) => setMemory(parseInt(e.target.value))}
                                        className="professional-input"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={createVM}
                                disabled={isCreating}
                                className="create-vm-button"
                            >
                                <Play className={`w-5 h-5 ${isCreating ? 'animate-spin' : ''}`} />
                                {isCreating ? `Creating VM... ${currentStep}` : 'Create VM'}
                            </button>
                        </div>
                    </div>

                    {/* Logs Panel */}
                    <div className="logs-panel">
                        <div className="panel-header">
                            <div className="panel-icon">
                                <Terminal className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="panel-title">Execution Logs</h2>
                        </div>

                        <div className="logs-container">
                            {logs.length === 0 ? (
                                <p className="no-logs">No logs yet. Click "Create VM" to start.</p>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log, index) => (
                                        <div key={index} className={`log-entry ${getLogColor(log.level)}`}>
                                            <div className="log-content">
                                                {getLogIcon(log.level)}
                                                <div className="log-details">
                                                    <div className="log-meta">
                                                        <span className="log-timestamp">{log.timestamp}</span>
                                                        <span className={`log-badge ${log.level === 'error' ? 'badge-error' :
                                                            log.level === 'success' ? 'badge-success' :
                                                                log.level === 'warning' ? 'badge-warning' :
                                                                    'badge-info'
                                                            }`}>
                                                            {log.level}
                                                        </span>
                                                    </div>
                                                    <p className="log-message">{log.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;