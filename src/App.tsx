import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  User, Users, Calendar, DollarSign, FileText, 
  LogOut, Home, UserCheck, Clock, TrendingUp,
  Edit, Trash2, Plus, X, Check, AlertCircle,
  Mail, Phone, Building, Briefcase, Eye, EyeOff, Lock
} from 'lucide-react';
import './App.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// API Configuration
const API_URL = 'http://192.168.40.35:3001';

// Types
interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joinDate: string;
  salary: number;
  status: 'active' | 'inactive';
  leaves?: number;
  usedLeaves?: number;
  photoUrl?: string;
}

interface Attendance {
  id: number;
  userId: number;
  date: string;
  status: 'present' | 'absent' | 'late';
  checkIn: string;
  checkOut: string;
}

interface Leave {
  id: number;
  userId: number;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
}

interface Payroll {
  id: number;
  userId: number;
  month: string;
  basicSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: 'paid' | 'pending';
  payDate: string;
}

interface Department {
  id: number;
  name: string;
  employeeCount: number;
}

const App: React.FC = () => {
  // State Management
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('login');
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Modal States
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  
  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    position: ''
  });

  // Load currentUser from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
      setCurrentPage('dashboard');
    }
    fetchInitialData();
  }, []);

  // Fetch all data from JSON server
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [usersRes, attendanceRes, leavesRes, payrollRes, departmentsRes] = await Promise.all([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/attendance`),
        axios.get(`${API_URL}/leaves`),
        axios.get(`${API_URL}/payroll`),
        axios.get(`${API_URL}/departments`)
      ]);
      
      setUsers(usersRes.data);
      setAttendance(attendanceRes.data);
      setLeaves(leavesRes.data);
      setPayroll(payrollRes.data);
      setDepartments(departmentsRes.data);
    } catch (err) {
      setError('Failed to fetch data. Please ensure JSON server is running on port 3001.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/users`);
      const user = response.data.find(
        (u: User) => u.username === loginForm.username && u.password === loginForm.password
      );
      
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user)); // Persist user in localStorage
        setCurrentPage('dashboard');
        setLoginForm({ username: '', password: '' });
        
        // Mark attendance for today if employee
        if (user.role === 'employee') {
          markTodayAttendance(user.id);
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mark Today's Attendance
  const markTodayAttendance = async (userId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const existingAttendance = attendance.find(
      a => a.userId === userId && a.date === today
    );
    
    if (!existingAttendance) {
      const now = new Date();
      const checkIn = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      try {
        const response = await axios.post(`${API_URL}/attendance`, {
          userId,
          date: today,
          status: 'present',
          checkIn,
          checkOut: '-'
        });
        setAttendance([...attendance, response.data]);
      } catch (err) {
        console.error('Failed to mark attendance:', err);
      }
    }
  };

  // Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const newUser: Omit<User, 'id'> = {
        ...registerForm,
        role: 'employee',
        joinDate: new Date().toISOString().split('T')[0],
        salary: 50000,
        status: 'active',
        leaves: 12,
        usedLeaves: 0,
        photoUrl: `https://ui-avatars.com/api/?name=${registerForm.name.replace(' ', '+')}&background=random&color=fff`
      };
      
      const response = await axios.post(`${API_URL}/users`, newUser);
      setUsers([...users, response.data]);
      alert('Registration successful! Please login.');
      setCurrentPage('login');
      setRegisterForm({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        position: ''
      });
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Remove from localStorage
    setCurrentPage('login');
  };

  // Delete User (Admin)
  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      
      // Also delete related data
      const userAttendance = attendance.filter(a => a.userId === userId);
      const userLeaves = leaves.filter(l => l.userId === userId);
      const userPayroll = payroll.filter(p => p.userId === userId);
      
      for (const item of userAttendance) {
        await axios.delete(`${API_URL}/attendance/${item.id}`);
      }
      for (const item of userLeaves) {
        await axios.delete(`${API_URL}/leaves/${item.id}`);
      }
      for (const item of userPayroll) {
        await axios.delete(`${API_URL}/payroll/${item.id}`);
      }
      
      setAttendance(attendance.filter(a => a.userId !== userId));
      setLeaves(leaves.filter(l => l.userId !== userId));
      setPayroll(payroll.filter(p => p.userId !== userId));
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  // Update User (Admin)
  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const formData = new FormData(e.currentTarget);
      const updatedUser: User = {
        ...editingUser,
        name: formData.get('name') as string || editingUser.name,
        email: formData.get('email') as string || editingUser.email,
        phone: formData.get('phone') as string || editingUser.phone,
        department: formData.get('department') as string || editingUser.department,
        position: formData.get('position') as string || editingUser.position,
        salary: parseFloat(formData.get('salary') as string) || editingUser.salary,
        status: (formData.get('status') as 'active' | 'inactive') || editingUser.status,
      };

      const response = await axios.put(`${API_URL}/users/${editingUser.id}`, updatedUser);
      setUsers(users.map(u => u.id === editingUser.id ? response.data : u));
      setShowEditModal(false);
      setEditingUser(null);
      fetchInitialData(); // Ensure data is refreshed from the server
    } catch (err) {
      setError('Failed to update user. Please try again.');
      console.error('Error updating user:', err);
    }
  };

  // Add New User (Admin)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const newUser: Omit<User, 'id'> = {
        username: formData.get('username') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as 'admin' | 'employee',
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        department: formData.get('department') as string,
        position: formData.get('position') as string,
        joinDate: new Date().toISOString().split('T')[0],
        salary: parseFloat(formData.get('salary') as string) || 50000, // Default salary if not provided
        status: 'active',
        leaves: 12,
        usedLeaves: 0,
        photoUrl: `https://ui-avatars.com/api/?name=${(formData.get('name') as string).replace(' ', '+')}&background=random&color=fff`
      };
      
      const response = await axios.post(`${API_URL}/users`, newUser);
      setUsers([...users, response.data]); // Immediately update state with new user
      fetchInitialData(); // Refresh data to ensure sync with server
      setShowAddUserModal(false);
      setError(''); // Clear any previous error
    } catch (err) {
      setError('Failed to add user. Please ensure all fields are filled correctly.');
      console.error('Error adding user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Leave Request
  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const newLeave: Omit<Leave, 'id'> = {
        userId: currentUser.id,
        type: formData.get('type') as string,
        from: formData.get('from') as string,
        to: formData.get('to') as string,
        reason: formData.get('reason') as string,
        status: 'pending',
        appliedDate: new Date().toISOString().split('T')[0]
      };
      
      const response = await axios.post(`${API_URL}/leaves`, newLeave);
      setLeaves([...leaves, response.data]);
      alert('Leave request submitted successfully!');
      (e.target as HTMLFormElement).reset();
      fetchInitialData(); // Refresh leaves after submission
    } catch (err) {
      setError('Failed to submit leave request');
    }
  };

  // Update Leave Status (Admin)
  const handleLeaveStatusUpdate = async (leaveId: number, status: 'approved' | 'rejected') => {
    try {
      const leave = leaves.find(l => l.id === leaveId);
      if (!leave) return;
      
      const updatedLeave = { ...leave, status };
      const response = await axios.put(`${API_URL}/leaves/${leaveId}`, updatedLeave);
      setLeaves(leaves.map(l => l.id === leaveId ? response.data : l));
      fetchInitialData(); // Refresh after update
    } catch (err) {
      setError('Failed to update leave status');
    }
  };

  // Get Today's Attendance Status
  const getTodayAttendance = (userId: number): string => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(a => a.userId === userId && a.date === today);
    return todayAttendance ? todayAttendance.status : 'absent';
  };

  // Calculate Statistics
  const getStatistics = () => {
    const totalEmployees = users.filter(u => u.role === 'employee').length;
    const activeEmployees = users.filter(u => u.role === 'employee' && u.status === 'active').length;
    const today = new Date().toISOString().split('T')[0];
    const presentToday = attendance.filter(a => a.date === today && a.status === 'present').length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const totalPayroll = payroll.reduce((sum, p) => sum + p.netPay, 0);
    
    return {
      totalEmployees,
      activeEmployees,
      presentToday,
      pendingLeaves,
      totalPayroll
    };
  };

  // Render Login Page
  const renderLogin = () => (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <Users size={48} className="logo-icon" />
          </div>
          <h1>HR Management System</h1>
          <p>Welcome back! Please login to continue.</p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <div className="input-group">
              <User size={20} className="input-icon" />
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Enter username"
                required
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="input-group">
              <Lock size={20} className="input-icon" />
              <div 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Enter password"
                required
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setCurrentPage('register')}
          >
            Create Account
          </button>
        </form>
        
        <div className="demo-credentials">
          <p>Demo Credentials:</p>
          <div className="credentials-grid">
            <div>
              <strong>Admin:</strong> admin / admin123
            </div>
            <div>
              <strong>Employee:</strong> john / john123
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Register Page
  const renderRegister = () => (
    <div className="login-container">
      <div className="register-card">
        <div className="login-header">
          <h1>Create Account</h1>
          <p>Join our HR Management System</p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <select
                value={registerForm.department}
                onChange={(e) => setRegisterForm({...registerForm, department: e.target.value})}
                required
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Position</label>
              <input
                type="text"
                value={registerForm.position}
                onChange={(e) => setRegisterForm({...registerForm, position: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setCurrentPage('login')}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );

  // Render Admin Dashboard
  const renderAdminDashboard = () => {
    const stats = getStatistics();
    
    // Chart Data
    const departmentData = {
      labels: departments.map(d => d.name),
      datasets: [{
        label: 'Employee Count',
        data: departments.map(d => d.employeeCount),
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(118, 75, 162, 0.8)',
          'rgba(237, 117, 136, 0.8)',
          'rgba(255, 166, 0, 0.8)',
          'rgba(32, 201, 151, 0.8)'
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(118, 75, 162, 1)',
          'rgba(237, 117, 136, 1)',
          'rgba(255, 166, 0, 1)',
          'rgba(32, 201, 151, 1)'
        ],
        borderWidth: 2
      }]
    };
    
    const attendanceData = {
      labels: ['Present', 'Absent', 'Late'],
      datasets: [{
        data: [
          attendance.filter(a => a.status === 'present').length,
          attendance.filter(a => a.status === 'absent').length,
          attendance.filter(a => a.status === 'late').length
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ],
        borderWidth: 0
      }]
    };
    
    const monthlyPayrollData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Total Payroll',
        data: [450000, 480000, 470000, 490000, 500000, 510000],
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4
      }]
    };
    
    return (
      <>
        <div className="welcome-card">
          <h1>Welcome back, {currentUser?.name}!</h1>
          <p>Here's your admin dashboard overview for today</p>
        </div>
        
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}>
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalEmployees}</div>
              <div className="stat-label">Total Employees</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #22c55e, #16a34a)'}}>
              <UserCheck size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.presentToday}</div>
              <div className="stat-label">Present Today</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingLeaves}</div>
              <div className="stat-label">Pending Leaves</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ef4444, #dc2626)'}}>
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">${stats.totalPayroll.toLocaleString()}</div>
              <div className="stat-label">Monthly Payroll</div>
            </div>
          </div>
        </div>
        
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Department Distribution</h3>
            <Bar data={departmentData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              }
            }} />
          </div>
          
          <div className="chart-container">
            <h3>Attendance Overview</h3>
            <Doughnut data={attendanceData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }} />
          </div>
          
          <div className="chart-container" style={{gridColumn: '1 / -1'}}>
            <h3>Monthly Payroll Trend</h3>
            <Line data={monthlyPayrollData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              }
            }} />
          </div>
        </div>
        
        <div className="recent-activities">
          <h3>Recent Activities</h3>
          <div className="activity-list">
            {leaves.slice(-5).reverse().map(leave => {
              const user = users.find(u => u.id === leave.userId);
              return (
                <div key={leave.id} className="activity-item">
                  <div className="activity-icon">
                    <FileText size={20} />
                  </div>
                  <div className="activity-content">
                    <p><strong>{user?.name}</strong> requested {leave.type}</p>
                    <span className="activity-time">{leave.appliedDate}</span>
                  </div>
                  <span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger'}`}>
                    {leave.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // Render Employee Dashboard
  const renderEmployeeDashboard = () => {
    if (!currentUser) return null;
    
    const todayStatus = getTodayAttendance(currentUser.id);
    const userLeaves = leaves.filter(l => l.userId === currentUser.id);
    const userPayroll = payroll.filter(p => p.userId === currentUser.id);
    const recentPayroll = userPayroll[userPayroll.length - 1];
    
    return (
      <>
        <div className="welcome-card employee-welcome">
          <div className="welcome-content">
            <div className="welcome-text">
                          <div className="welcome-avatar">
              <img src={currentUser.photoUrl} alt={currentUser.name} />
            </div>
              <h1>Hello, {currentUser.name}!</h1>
              <p>Welcome to your employee dashboard</p>
              <div className="attendance-status">
                <Clock size={20} />
                <span>Today's Status: </span>
                <span className={`badge badge-${todayStatus === 'present' ? 'success' : 'danger'}`}>
                  {todayStatus.charAt(0).toUpperCase() + todayStatus.slice(1)}
                </span>
              </div>
            </div>

          </div>
        </div>
        
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}>
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{currentUser.leaves || 12}</div>
              <div className="stat-label">Total Leaves</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #22c55e, #16a34a)'}}>
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{currentUser.usedLeaves || 0}</div>
              <div className="stat-label">Used Leaves</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{(currentUser.leaves || 12) - (currentUser.usedLeaves || 0)}</div>
              <div className="stat-label">Available Leaves</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ef4444, #dc2626)'}}>
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">${recentPayroll?.netPay.toLocaleString() || '0'}</div>
              <div className="stat-label">Last Salary</div>
            </div>
          </div>
        </div>
        
        <div className="quick-info-grid">
          <div className="info-card">
            <h3>Personal Information</h3>
            <div className="info-list">
              <div className="info-item">
                <Mail size={16} />
                <span>{currentUser.email}</span>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <span>{currentUser.phone}</span>
              </div>
              <div className="info-item">
                <Building size={16} />
                <span>{currentUser.department}</span>
              </div>
              <div className="info-item">
                <Briefcase size={16} />
                <span>{currentUser.position}</span>
              </div>
            </div>
          </div>
          
          <div className="info-card">
            <h3>Recent Leave Requests</h3>
            <div className="leave-list">
              {userLeaves.slice(-3).reverse().map(leave => (
                <div key={leave.id} className="leave-item">
                  <div className="leave-info">
                    <strong>{leave.type}</strong>
                    <span>{leave.from} to {leave.to}</span>
                  </div>
                  <span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger'}`}>
                    {leave.status}
                  </span>
                </div>
              ))}
              {userLeaves.length === 0 && (
                <p className="no-data">No leave requests yet</p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render Employees List (Admin)
  const renderEmployees = () => (
    <div className="page-container">
      <div className="page-header">
        <h2>Employee Management</h2>
        <button className="btn btn-cute" onClick={() => setShowAddUserModal(true)}>
          <Plus size={16} />
        </button>
      </div>
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Position</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.role === 'employee').map(user => (
              <tr key={user.id}>
                <td>
                  <img src={user.photoUrl} alt={user.name} className="table-avatar" />
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td>{user.position}</td>
                <td>
                  <span className={`badge badge-${user.status === 'active' ? 'success' : 'danger'}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon btn-edit"
                      onClick={() => {
                        setEditingUser(user);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Employee List Page
  const renderEmployeeList = () => (
    <div className="page-container">
      <div className="page-header">
        <h2>Employee List</h2>
      </div>
      <div className="employee-list-container">
        {users.filter(u => u.role === 'employee').map(user => (
          <div key={user.id} className="employee-box">
            <img src={user.photoUrl} alt={user.name} className="employee-avatar" />
            <div className="employee-details">
              <p><strong>{user.name}</strong></p>
              <p>{user.position}</p>
              <p>{user.department}</p>
              <span className={`badge badge-${user.status === 'active' ? 'success' : 'danger'}`}>
                {user.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Profile Page
  const renderProfile = () => {
    if (!currentUser) return null;
    
    return (
      <div className="profile-section">
        <div className="profile-header">
          <div className="profile-avatar">
            <img src={currentUser.photoUrl} alt={currentUser.name} />
          </div>
          <div className="profile-info">
            <h2>{currentUser.name}</h2>
            <p>{currentUser.position} - {currentUser.department}</p>
            <span className={`badge badge-${currentUser.status === 'active' ? 'success' : 'danger'}`}>
              {currentUser.status}
            </span>
          </div>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Employee ID</div>
            <div className="info-value">EMP{currentUser.id.toString().padStart(4, '0')}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Email</div>
            <div className="info-value">{currentUser.email}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Phone</div>
            <div className="info-value">{currentUser.phone}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Join Date</div>
            <div className="info-value">{currentUser.joinDate}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Department</div>
            <div className="info-value">{currentUser.department}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Position</div>
            <div className="info-value">{currentUser.position}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Base Salary</div>
            <div className="info-value">${currentUser.salary.toLocaleString()}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Total Leaves</div>
            <div className="info-value">{currentUser.leaves || 12} days</div>
          </div>
        </div>
      </div>
    );
  };

  // Render Attendance Page
  const renderAttendance = () => {
    const userAttendance = currentUser 
      ? attendance.filter(a => a.userId === currentUser.id)
      : attendance;
    
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>Attendance Records</h2>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {currentUser?.role === 'admin' && <th>Employee</th>}
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
              </tr>
            </thead>
            <tbody>
              {userAttendance.map(record => {
                const user = users.find(u => u.id === record.userId);
                const checkIn = record.checkIn.split(':');
                const checkOut = record.checkOut.split(':');
                let workingHours = '-';
                
                if (record.checkOut !== '-') {
                  const hours = parseInt(checkOut[0]) - parseInt(checkIn[0]);
                  const minutes = parseInt(checkOut[1]) - parseInt(checkIn[1]);
                  workingHours = `${hours}h ${minutes}m`;
                }
                
                return (
                  <tr key={record.id}>
                    {currentUser?.role === 'admin' && <td>{user?.name}</td>}
                    <td>{record.date}</td>
                    <td>
                      <span className={`badge badge-${record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.checkIn}</td>
                    <td>{record.checkOut}</td>
                    <td>{workingHours}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Payroll Page
  const renderPayroll = () => {
    const userPayroll = currentUser?.role === 'employee' 
      ? payroll.filter(p => p.userId === currentUser.id)
      : payroll;
    
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>Payroll Records</h2>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {currentUser?.role === 'admin' && <th>Employee</th>}
                <th>Month</th>
                <th>Basic Salary</th>
                <th>Bonus</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Pay Date</th>
              </tr>
            </thead>
            <tbody>
              {userPayroll.map(record => {
                const user = users.find(u => u.id === record.userId);
                return (
                  <tr key={record.id}>
                    {currentUser?.role === 'admin' && <td>{user?.name}</td>}
                    <td>{record.month}</td>
                    <td>${record.basicSalary.toLocaleString()}</td>
                    <td>${record.bonus.toLocaleString()}</td>
                    <td>${record.deductions.toLocaleString()}</td>
                    <td><strong>${record.netPay.toLocaleString()}</strong></td>
                    <td>
                      <span className={`badge badge-${record.status === 'paid' ? 'success' : 'warning'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.payDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Leave Form
  const renderLeaveForm = () => (
    <div className="form-container">
      <h2>Leave Request Form</h2>
      <form onSubmit={handleLeaveRequest}>
        <div className="form-row">
          <div className="form-group">
            <label>Leave Type</label>
            <select name="type" required>
              <option value="">Select Type</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Annual Leave">Annual Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>From Date</label>
            <input type="date" name="from" required />
          </div>
          <div className="form-group">
            <label>To Date</label>
            <input type="date" name="to" required />
          </div>
        </div>
        
        <div className="form-group">
          <label>Reason</label>
          <textarea name="reason" rows={4} required></textarea>
        </div>
        
        <button type="submit" className="btn btn-primary">Submit Request</button>
      </form>
    </div>
  );

  // Render Leave Status
  const renderLeaveStatus = () => {
    const userLeaves = currentUser?.role === 'employee'
      ? leaves.filter(l => l.userId === currentUser.id)
      : leaves;
    
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>Leave Requests</h2>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {currentUser?.role === 'admin' && <th>Employee</th>}
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Applied Date</th>
                <th>Status</th>
                {currentUser?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {userLeaves.map(leave => {
                const user = users.find(u => u.id === leave.userId);
                return (
                  <tr key={leave.id}>
                    {currentUser?.role === 'admin' && <td>{user?.name}</td>}
                    <td>{leave.type}</td>
                    <td>{leave.from}</td>
                    <td>{leave.to}</td>
                    <td>{leave.reason}</td>
                    <td>{leave.appliedDate}</td>
                    <td>
                      <span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger'}`}>
                        {leave.status}
                      </span>
                    </td>
                    {currentUser?.role === 'admin' && leave.status === 'pending' && (
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon btn-success"
                            onClick={() => handleLeaveStatusUpdate(leave.id, 'approved')}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="btn-icon btn-danger"
                            onClick={() => handleLeaveStatusUpdate(leave.id, 'rejected')}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Edit User Modal
  const renderEditUserModal = () => (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Edit Employee</h2>
          <button className="close-btn" onClick={() => setShowEditModal(false)}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleUpdateUser}>
          <div className="form-group">
            <label>Name</label>
            <input name="name" defaultValue={editingUser?.name || ''} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" defaultValue={editingUser?.email || ''} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" defaultValue={editingUser?.phone || ''} required />
          </div>
          <div className="form-group">
            <label>Department</label>
            <select name="department" defaultValue={editingUser?.department || ''} required>
              <option value="">Select Department</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
          <div className="form-group">
            <label>Position</label>
            <input name="position" defaultValue={editingUser?.position || ''} required />
          </div>
          <div className="form-group">
            <label>Salary</label>
            <input name="salary" type="number" defaultValue={editingUser?.salary || 0} required />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" defaultValue={editingUser?.status || 'active'} required>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Save Changes</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render Add User Modal
  const renderAddUserModal = () => (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Add New User</h2>
          <button className="close-btn" onClick={() => setShowAddUserModal(false)}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" required>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          <div className="form-group">
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" required />
          </div>
          <div className="form-group">
            <label>Department</label>
            <select name="department" required>
              <option value="">Select Department</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
          <div className="form-group">
            <label>Position</label>
            <input name="position" required />
          </div>
          <div className="form-group">
            <label>Salary</label>
            <input name="salary" type="number" required />
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add User'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  // Main Dashboard Renderer
  const renderDashboard = () => {
    if (!currentUser) return null;
    
    return (
      <div className="dashboard-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Users size={32} className="sidebar-logo" />
            <h2>HR System</h2>
            <p>{currentUser.role === 'admin' ? 'Admin Panel' : 'Employee Portal'}</p>
          </div>
          
          <ul className="nav-menu">
            <li className="nav-item">
              <a 
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                <Home size={20} className="nav-icon" />
                Dashboard
              </a>
            </li>
            
            {currentUser.role === 'admin' ? (
              <>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'employees' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('employees')}
                  >
                    <Users size={20} className="nav-icon" />
                    Employees
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'employee-list' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('employee-list')}
                  >
                    <Users size={20} className="nav-icon" />
                    Employee List
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'attendance' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('attendance')}
                  >
                    <Calendar size={20} className="nav-icon" />
                    Attendance
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'payroll' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('payroll')}
                  >
                    <DollarSign size={20} className="nav-icon" />
                    Payroll
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'leave-status' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('leave-status')}
                  >
                    <FileText size={20} className="nav-icon" />
                    Leave Requests
                  </a>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('profile')}
                  >
                    <User size={20} className="nav-icon" />
                    Profile
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'attendance' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('attendance')}
                  >
                    <Calendar size={20} className="nav-icon" />
                    Attendance
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'payroll' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('payroll')}
                  >
                    <DollarSign size={20} className="nav-icon" />
                    Payroll
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'leave-form' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('leave-form')}
                  >
                    <FileText size={20} className="nav-icon" />
                    Leave Request
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'leave-status' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('leave-status')}
                  >
                    <Clock size={20} className="nav-icon" />
                    Leave Status
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${currentPage === 'employee-list' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('employee-list')}
                  >
                    <Users size={20} className="nav-icon" />
                    Employee List
                  </a>
                </li>
              </>
            )}
            
            <li className="nav-item logout-item">
              <a className="nav-link" onClick={handleLogout}>
                <LogOut size={20} className="nav-icon" />
                Logout
              </a>
            </li>
          </ul>
        </aside>
        
        <div className="main-content">
          <header className="header">
            <h2 className="header-title">
              {currentPage === 'dashboard' ? 'Dashboard' :
               currentPage === 'profile' ? 'My Profile' :
               currentPage === 'employees' ? 'Employee Management' :
               currentPage === 'employee-list' ? 'Employee List' :
               currentPage === 'attendance' ? 'Attendance' :
               currentPage === 'payroll' ? 'Payroll' :
               currentPage === 'leave-form' ? 'Leave Request' :
               currentPage === 'leave-status' ? 'Leave Status' : ''}
            </h2>
            <div className="date-time">Saturday, August 30, 2025, 03:35 PM +0545</div>
            <div className="user-info">
              <img src={currentUser.photoUrl} alt={currentUser.name} className="user-avatar" />
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role">{currentUser.role}</span>
              </div>
            </div>
          </header>
          
          <div className="content-area">
            {currentPage === 'dashboard' && (currentUser.role === 'admin' ? renderAdminDashboard() : renderEmployeeDashboard())}
            {currentPage === 'employees' && renderEmployees()}
            {currentPage === 'employee-list' && renderEmployeeList()}
            {currentPage === 'profile' && renderProfile()}
            {currentPage === 'attendance' && renderAttendance()}
            {currentPage === 'payroll' && renderPayroll()}
            {currentPage === 'leave-form' && renderLeaveForm()}
            {currentPage === 'leave-status' && renderLeaveStatus()}
          </div>
        </div>
        
        {showEditModal && editingUser && renderEditUserModal()}
        {showAddUserModal && renderAddUserModal()}
      </div>
    );
  };

  return (
    <div className="App">
      {currentPage === 'login' && renderLogin()}
      {currentPage === 'register' && renderRegister()}
      {(currentPage !== 'login' && currentPage !== 'register') && renderDashboard()}
      <footer className="footer">
        <p>&copy; 2025 HR Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;