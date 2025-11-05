'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Vendor } from '@/types';
import { Toast } from '@/app/components/Toast';
import { Loading } from '@/app/components/Loading';
import { ConfirmationDialog } from '@/app/components/ConfirmationDialog';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface VendorFormData {
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VendorFormData) => Promise<void>;
  initialData?: Vendor | null;
  isLoading: boolean;
}

function VendorModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: ModalProps) {
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    contact: '',
    email: '',
    address: '',
  });
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        contact: initialData.contact,
        email: initialData.email || '',
        address: initialData.address || '',
      });
    } else {
      setFormData({
        name: '',
        contact: '',
        email: '',
        address: '',
      });
    }
    setEmailError('');
  }, [initialData, isOpen]);

  const validateEmail = (email: string): boolean => {
    if (!email || email.trim() === '') return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email before submission
    if (formData.email && !validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Enter vendor name"
            />
          </div>
          <div>
            <label
              htmlFor="contact"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Contact <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contact"
              required
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              placeholder="Enter contact information"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              inputMode="email"
              value={formData.email}
              onChange={handleEmailChange}
              className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all ${
                emailError
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter email address (optional)"
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {emailError}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Address
            </label>
            <textarea
              id="address"
              rows={4}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all"
              placeholder="Enter address (optional)"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 disabled:opacity-50 transition-all duration-150 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !!emailError}
              className="flex-1 px-4 py-3 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 touch-manipulation hover:shadow-md active:scale-[0.98]"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; vendor: Vendor | null }>({
    isOpen: false,
    vendor: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { sortedData, handleSort, sortConfig } = useSortable(vendors);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch vendors');
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch vendors. Please try again.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleAdd = () => {
    setEditingVendor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setDeleteDialog({ isOpen: true, vendor });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.vendor) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/vendors/${deleteDialog.vendor.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete vendor');
      }

      showToast('Vendor deleted successfully', 'success');
      setDeleteDialog({ isOpen: false, vendor: null });
      fetchVendors();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete vendor. Please try again.';
      showToast(message, 'error');
      setDeleteDialog({ isOpen: false, vendor: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (formData: VendorFormData) => {
    try {
      setIsSubmitting(true);
      const url = editingVendor
        ? `/api/vendors/${editingVendor.id}`
        : '/api/vendors';
      const method = editingVendor ? 'PUT' : 'POST';

      // Convert empty strings to null for optional fields
      const payload = {
        name: formData.name,
        contact: formData.contact,
        email: formData.email.trim() === '' ? null : formData.email.trim(),
        address: formData.address.trim() === '' ? null : formData.address.trim(),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save vendor');
      }

      showToast(
        editingVendor
          ? 'Vendor updated successfully'
          : 'Vendor created successfully',
        'success'
      );
      setIsModalOpen(false);
      setEditingVendor(null);
      // Reset form will happen automatically via useEffect when isOpen changes
      await fetchVendors();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save vendor. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Vendors
          </h1>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </button>
        </div>

        {loading ? (
          <Loading message="Loading vendors..." />
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              No vendors found. Add your first vendor to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <SortableHeader
                        label="Name"
                        sortKey="name"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Contact"
                        sortKey="contact"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Email"
                        sortKey="email"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <SortableHeader
                        label="Address"
                        sortKey="address"
                        currentSortKey={sortConfig?.key as string}
                        sortDirection={sortConfig?.direction || null}
                        onSort={handleSort}
                        align="left"
                        className="dark:text-gray-400"
                      />
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                    {sortedData.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-150 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                          >
                            {vendor.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {vendor.contact}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {vendor.email || (
                            <span className="text-gray-400 dark:text-gray-500 italic">
                              No email
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {vendor.address || (
                            <span className="text-gray-400 dark:text-gray-500 italic">
                              No address
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(vendor)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                              aria-label="Edit vendor"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(vendor)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                              aria-label="Delete vendor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 hover:shadow-md transition-shadow duration-150"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                      >
                        {vendor.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-150 active:scale-95"
                        aria-label="Edit vendor"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(vendor)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 active:scale-95"
                        aria-label="Delete vendor"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Contact
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {vendor.contact}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Email
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {vendor.email || (
                          <span className="text-gray-400 dark:text-gray-500 italic">
                            No email
                          </span>
                        )}
                      </p>
                    </div>
                    {vendor.address && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Address
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {vendor.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <VendorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVendor(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingVendor}
        isLoading={isSubmitting}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteDialog.vendor?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, vendor: null })}
        isLoading={isDeleting}
      />
    </>
  );
}

