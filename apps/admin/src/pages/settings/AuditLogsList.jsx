import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Search } from 'lucide-react';

export default function AuditLogsList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/audit-logs'); 
      setLogs(data.data?.data || data.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse p-6">Loading audit logs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-charcoal">Audit Logs</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-charcoal/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ivory text-sm text-charcoal/60 border-b border-charcoal/10">
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Resource</th>
                <th className="p-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                  <td className="p-4 text-sm text-charcoal/70">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-charcoal">
                    {log.adminId ? `${log.adminId.firstName} ${log.adminId.lastName}` : 'System'}
                  </td>
                  <td className="p-4 text-sm font-medium text-brand">
                    {log.action}
                  </td>
                  <td className="p-4 text-sm text-charcoal/70">
                    {log.resource} ({log.resourceId})
                  </td>
                  <td className="p-4 text-xs text-charcoal/60 font-mono">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-charcoal/50 text-sm">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
