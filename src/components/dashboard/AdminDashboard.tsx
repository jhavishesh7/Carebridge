import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Car, DollarSign, Activity, TrendingUp, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalRiders: number;
  totalRides: number;
  totalEarnings: number;
  activeRides: number;
  completedRides: number;
  pendingRides: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPatients: 0,
    totalRiders: 0,
    totalRides: 0,
    totalEarnings: 0,
    activeRides: 0,
    completedRides: 0,
    pendingRides: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role');

      // Fetch appointment stats
      const { data: appointments } = await supabase
        .from('appointments')
        .select('status, total_cost');

      // Fetch earnings stats
      const { data: earnings } = await supabase
        .from('earnings')
        .select('amount');

      if (profiles && appointments && earnings) {
        const totalUsers = profiles.length;
        const totalPatients = profiles.filter(p => p.role === 'patient').length;
        const totalRiders = profiles.filter(p => p.role === 'rider').length;
        
        const totalRides = appointments.length;
        const activeRides = appointments.filter(a => 
          a.status === 'accepted' || a.status === 'in_progress'
        ).length;
        const completedRides = appointments.filter(a => a.status === 'completed').length;
        const pendingRides = appointments.filter(a => a.status === 'pending').length;
        
        const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

        setStats({
          totalUsers,
          totalPatients,
          totalRiders,
          totalRides,
          totalEarnings,
          activeRides,
          completedRides,
          pendingRides,
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and manage the CareBridge platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Activity className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeRides}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Patients</span>
              <span className="font-semibold">{stats.totalPatients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Riders</span>
              <span className="font-semibold">{stats.totalRiders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="font-semibold">{stats.totalUsers - stats.totalPatients - stats.totalRiders}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ride Status</h3>
            <Car className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">{stats.pendingRides}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active</span>
              <span className="font-semibold text-blue-600">{stats.activeRides}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{stats.completedRides}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Platform Health</h3>
            <TrendingUp className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="font-semibold text-green-600">
                {stats.totalRides > 0 ? ((stats.completedRides / stats.totalRides) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Earnings/Ride</span>
              <span className="font-semibold">
                ${stats.completedRides > 0 ? (stats.totalEarnings / stats.completedRides).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Platform Status</span>
              <span className="font-semibold text-green-600">Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-blue-900">Manage Users</p>
                <p className="text-sm text-blue-700">View and manage all users</p>
              </div>
            </button>

            <button className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
              <div className="p-2 bg-green-600 rounded-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-green-900">Monitor Rides</p>
                <p className="text-sm text-green-700">Track all ride activities</p>
              </div>
            </button>

            <button className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-purple-900">View Analytics</p>
                <p className="text-sm text-purple-700">Detailed platform analytics</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}