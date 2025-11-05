'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Toast } from '@/app/components/Toast';

interface Vendor {
  id: string;
  name: string;
}

export default function NewIntendPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    vendor_id: '',
    notes: '',
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showToast('Failed to load vendors', 'error');
    } finally {
      setLoadingVendors(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Prepare payload - don't include name, API will generate it
      const payload: {
        vendor_id?: string | null;
        notes?: string | null;
      } = {};

      // Only include vendor_id if provided
      if (formData.vendor_id) {
        payload.vendor_id = formData.vendor_id;
      }

      // Only include notes if provided
      if (formData.notes.trim()) {
        payload.notes = formData.notes.trim();
      }

      const response = await fetch('/api/intends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create intend');
      }

      const data = await response.json();

      showToast('Intend created successfully', 'success');

      // Redirect to the intend detail page
      router.push(`/intends/${data.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create intend. Please try again.';
      showToast(message, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/intends"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to intends"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Intend</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              A unique intend ID will be automatically generated (e.g., 02NOV2025-001)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vendor Selection */}
            <div>
              <label
                htmlFor="vendor_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Vendor
              </label>
              {loadingVendors ? (
                <div className="py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Loading vendors...</span>
                </div>
              ) : (
                <select
                  id="vendor_id"
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                >
                  <option value="">Select a vendor (optional)</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Notes Section */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 resize-none transition-all"
                placeholder="Enter any notes or comments (optional)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <Link
                href="/intends"
                className="flex-1 px-4 py-3 text-base font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Intend
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
