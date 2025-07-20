import React, { useState } from 'react';
import { Play, AlertCircle, CheckCircle, Terminal, Settings, Cpu, HardDrive, Trash2, ChevronDown, LogOut } from 'lucide-react';
import LoginPage from './component/LoginPage';
import { useAuth } from './hook/useAuth';
import { useVMLogs } from './hook/useVMLogs';
type LogLevel = 'error' | 'warning' | 'info' | 'success';

type LogEntry = {
    timestamp: string;
    level: LogLevel;
    message: string;
};


function App() {
    const { user, loading: authLoading, logout, isAuthenticated, getAuthHeaders } = useAuth();
    const { vmLogs, createVMLog, updateVMLog } = useVMLogs(user?.id || null);
    const [boxName, setBoxName] = useState("ubuntu/bionic64");
    const [vmName, setVmName] = useState("test-vm");
    const [osType, setOsType] = useState<'linux' | 'windows'>('linux');
    const [selectedOS, setSelectedOS] = useState("Ubuntu 20.04");
    const [cpus, setCpus] = useState(2);
    const [memory, setMemory] = useState(2048);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isDestroying, setIsDestroying] = useState(false);
    const [currentStep, setCurrentStep] = useState("");
    const [showOSDropdown, setShowOSDropdown] = useState(false);

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className="min-h-screen professional-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated with JWT
    if (!user || !isAuthenticated()) {
        return <LoginPage onLogin={() => { }} />;
    }

    const addLog = (level: LogLevel, message: string) => {
        const newLog: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message,
        };
        setLogs((prev) => [...prev, newLog]);
    };


    const createVM = async () => {
        setIsCreating(true);
        setLogs([]);

        // Create VM log entry in database
        const vmLogEntry = await createVMLog({
            box_name: boxName,
            vm_name: vmName,
            cpus,
            memory
        });

        try {
            addLog('info', 'Starting VM creation process...');
            addLog('warning', 'Checking for common issues...');

            // Validate box name
            if (boxName.includes(' ')) {
                addLog('warning', 'Box name contains spaces - this might cause issues!');
            }

            setCurrentStep('Initializing');

            const response = await fetch('http://localhost:8000/create-vm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
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

                // Update VM log with success
                if (vmLogEntry) {
                    await updateVMLog(vmLogEntry.id, {
                        status: 'success',
                        logs: logs,
                        terraform_output: result.terraform_apply
                    });
                }
            } else {
                addLog('error', `Error: ${result.detail}`);

                // Update VM log with error
                if (vmLogEntry) {
                    await updateVMLog(vmLogEntry.id, {
                        status: 'error',
                        logs: logs,
                        terraform_output: result.detail
                    });
                }

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

            // Update VM log with error
            if (vmLogEntry) {
                await updateVMLog(vmLogEntry.id, {
                    status: 'error',
                    logs: logs,
                    terraform_output: error.toString()
                });
            }
        } finally {
            setIsCreating(false);
            setCurrentStep('');
        }
    };

    const destroyVM = async () => {
        setIsDestroying(true);
        setLogs([]);

        try {
            addLog('warning', 'Starting VM destruction process...');
            setCurrentStep('Destroying');

            const response = await fetch('http://localhost:8000/destroy-vm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    vm_name: vmName
                })
            });

            const result = await response.json();

            if (response.ok) {
                addLog('success', 'VM destroyed successfully!');
                addLog('info', `Terraform destroy output: ${result.terraform_destroy}`);
            } else {
                addLog('error', `Error: ${result.detail}`);
            }
        } catch (error) {
            addLog('error', `Network error: ${error}`);
        } finally {
            setIsDestroying(false);
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

    const linuxOptions = [
        'Ubuntu 20.04',
        'Ubuntu 22.04',
        'Ubuntu 23.04',
        'Rocky 8',
        'Rocky 9'
    ];

    const windowsOptions = [
        'Windows Server 2016',
        'Windows Server 2019',
        'Windows Server 2022'
    ];

    const handleOSChange = (os: string) => {
        setSelectedOS(os);
        setShowOSDropdown(false);
        // Map OS selection to vagrant box names
        const osBoxMap: { [key: string]: string } = {
            'Ubuntu 20.04': 'ubuntu/focal64',
            'Ubuntu 22.04': 'ubuntu/jammy64',
            'Ubuntu 23.04': 'ubuntu/lunar64',
            'Rocky 8': 'rockylinux/8',
            'Rocky 9': 'rockylinux/9',
            'Windows Server 2016': 'gusztavvargadr/windows-server-2016-standard',
            'Windows Server 2019': 'gusztavvargadr/windows-server-2019-standard',
            'Windows Server 2022': 'gusztavvargadr/windows-server-2022-standard'
        };
        setBoxName(osBoxMap[os] || 'ubuntu/focal64');
    };

    return (
        <div className="min-h-screen professional-bg">
            {/* Logout Button */}
            <button
                onClick={logout}
                className="logout-btn"
                title="Logout"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
            </button>

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
                        <h1 className="main-title">
                            VM Creation Debugger
                            <span className="user-email">Welcome, {user.email}</span>
                        </h1>
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


                            <div>
                                <label className="input-label">
                                    <Settings className="w-4 h-4 inline mr-1" />
                                    Operating System
                                </label>

                                {/* OS Type Selection */}
                                <div className="os-type-selector">
                                    <button
                                        type="button"
                                        onClick={() => setOsType('linux')}
                                        className={`os-type-btn ${osType === 'linux' ? 'active' : ''}`}
                                    >
                                        Linux
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOsType('windows')}
                                        className={`os-type-btn ${osType === 'windows' ? 'active' : ''}`}
                                    >
                                        Windows
                                    </button>
                                </div>

                                {/* OS Version Dropdown */}
                                <div>
                                    <div className="os-dropdown">
                                        <button
                                            type="button"
                                            className="os-dropdown-btn"
                                            onClick={() => setShowOSDropdown(!showOSDropdown)}
                                        >
                                            {selectedOS}
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <div className={`os-dropdown-menu ${showOSDropdown ? 'show' : ''}`}>
                                            {(osType === 'linux' ? linuxOptions : windowsOptions).map((os) => (
                                                <button
                                                    key={os}
                                                    type="button"
                                                    onClick={() => handleOSChange(os)}
                                                    className="os-dropdown-item"
                                                >
                                                    {os}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="vm-action-buttons">
                                <button
                                    onClick={createVM}
                                    disabled={isCreating || isDestroying}
                                    className="create-vm-button"
                                >
                                    <Play className={`w-5 h-5 ${isCreating ? 'animate-spin' : ''}`} />
                                    {isCreating ? `Creating VM... ${currentStep}` : 'Create VM'}
                                </button>

                                <button
                                    onClick={destroyVM}
                                    disabled={isCreating || isDestroying}
                                    className="destroy-vm-button"
                                >
                                    <Trash2 className={`w-5 h-5 ${isDestroying ? 'animate-spin' : ''}`} />
                                    {isDestroying ? `Destroying VM... ${currentStep}` : 'Destroy VM'}
                                </button>
                            </div>
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
                                <div>
                                    <p className="no-logs">No logs yet. Click "Create VM" to start.</p>
                                    {vmLogs.length > 0 && (
                                        <div className="previous-logs">
                                            <h4 className="text-sm font-semibold text-slate-400 mb-2">Previous VM Creations:</h4>
                                            {vmLogs.slice(0, 3).map((log) => (
                                                <div key={log.id} className="previous-log-item">
                                                    <span className={`status-badge ${log.status}`}>{log.status}</span>
                                                    <span className="log-vm-name">{log.vm_name}</span>
                                                    <span className="log-date">{new Date(log.created_at).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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