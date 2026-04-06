/**
 * Invoice Form Component - Formulario de facturación electrónica
 * ✅ SOLO guarda cuando se oprime "Guardar Datos"
 * ✅ Evita que el formulario “se cierre solo” cuando llega savedData desde fetch/initialData
 * ✅ isFormValid con trim()
 * ✅ setFormData funcional (evita estados viejos)
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Edit2, X } from 'lucide-react';
import { supabase } from '../../providers/AuthProvider';

interface InvoiceData {
  id?: string;
  personType: 'natural' | 'juridica';
  documentType: 'NIT' | 'CC' | 'CE' | 'PP' | 'TI';
  documentNumber: string;
  businessName: string;
  address: string;
  city: string;
  department: string;
  phone?: string;
  email: string;
  regime?: string;
}

interface InvoiceFormProps {
  onDataChange: (data: InvoiceData | null) => void;
  initialData?: InvoiceData | null;
}

const COLOMBIAN_DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
];

const COLOMBIAN_CITIES: Record<string, string[]> = {
  Cundinamarca: ['Bogotá D.C.', 'Chía', 'Cajicá', 'Zipaquirá', 'Soacha'],
  Antioquia: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón'],
  Bolívar: ['Cartagena', 'Magangué'],
  'Norte de Santander': ['Cúcuta', 'Villa del Rosario'],
  Tolima: ['Ibagué', 'Espinal'],
  Huila: ['Neiva', 'Pitalito'],
  Quindío: ['Armenia', 'Calarcá'],
  Risaralda: ['Pereira', 'Dosquebradas'],
  Caldas: ['Manizales', 'La Dorada'],
};

export function InvoiceForm({ onDataChange, initialData }: InvoiceFormProps) {
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [loading, setLoading] = useState(false);

  const [savedData, setSavedData] = useState<InvoiceData | null>(null);
  const [editing, setEditing] = useState(false);

  // ✅ Evita que el form se “cierre solo” por datos que llegan async
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const editingRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  const [formData, setFormData] = useState<InvoiceData>({
    personType: 'natural',
    documentType: 'CC',
    documentNumber: '',
    businessName: '',
    address: '',
    city: '',
    department: '',
    phone: '',
    email: '',
    regime: '',
  });

  const availableCities = useMemo(() => {
    return formData.department ? COLOMBIAN_CITIES[formData.department] || [] : [];
  }, [formData.department]);

  const isFormValid = (): boolean => {
    const docNum = formData.documentNumber?.trim();
    const name = formData.businessName?.trim();
    const addr = formData.address?.trim();
    const city = formData.city?.trim();
    const dept = formData.department?.trim();
    const email = formData.email?.trim();

    return Boolean(
      formData.documentType && docNum && name && addr && city && dept && email
    );
  };

  // ✅ Cargar saved data al montar
  useEffect(() => {
    fetchSavedInvoiceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Si llega initialData (por props), NO pises lo que el usuario ya escribió
  useEffect(() => {
    if (!initialData) return;

    // Si el usuario ya está escribiendo o editando, ignorar
    if (dirtyRef.current || editingRef.current) return;

    setSavedData(initialData);
    setFormData(initialData);
    setNeedsInvoice(true);
    setEditing(false);
  }, [initialData]);

  // ✅ Mandar data al padre (checkout) pero SIN guardar
  useEffect(() => {
    if (!needsInvoice) {
      onDataChange(null);
      return;
    }

    // Si hay guardado y NO está editando y NO está “dirty”, manda lo guardado
    if (savedData && !editing && !dirty) {
      onDataChange(savedData);
      return;
    }

    // Si está editando / creando, manda lo del form solo si es válido
    onDataChange(isFormValid() ? formData : null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInvoice, savedData, editing, dirty, formData]);

  const fetchSavedInvoiceData = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/student/invoice-data', {
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.data?.invoiceData) {
        // ✅ NO sobrescribas si ya está escribiendo o si entró a editar
        if (dirtyRef.current || editingRef.current) return;

        setSavedData(data.data.invoiceData);
        setFormData(data.data.invoiceData);
        // Nota: no fuerces needsInvoice aquí; el usuario decide con el checkbox
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/student/invoice-data', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // OJO: algunos backends devuelven {data: {...}} o directamente {...}
        const saved = data.data?.invoiceData ?? data.data ?? data;

        setSavedData(saved);
        setFormData(saved);
        setDirty(false);
        dirtyRef.current = false;

        // Cierra edición y muestra "Datos guardados"
        setEditing(false);

        alert('Datos de facturación guardados exitosamente');
      } else {
        alert(data.error || 'Error al guardar datos');
      }
    } catch (error) {
      console.error('Error saving invoice data:', error);
      alert('Error al guardar datos de facturación');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Si está cargando y aún no hay nada, muestra spinner
  if (loading && !savedData) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  // ✅ Vista: si hay savedData y no estás editando y no estás dirty => muestra resumen.
  // Si estás dirty, se queda mostrando el formulario (no se “cierra solo”).
  const showSavedView = Boolean(savedData && !editing && !dirty);

  const markDirty = () => {
    if (!dirtyRef.current) {
      setDirty(true);
      dirtyRef.current = true;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Facturación Electrónica</h3>
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <input
            type="checkbox"
            checked={needsInvoice}
            onChange={(e) => {
              const checked = e.target.checked;
              setNeedsInvoice(checked);

              if (!checked) {
                // Apagar todo
                setEditing(false);
                setDirty(false);
                dirtyRef.current = false;
                return;
              }

              // Si no hay datos guardados, abre el form directamente
              if (!savedData) {
                setEditing(true);
                setDirty(false);
                dirtyRef.current = false;
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm leading-5 text-gray-700">Necesito factura electrónica</span>
        </label>
      </div>

      {needsInvoice && (
        <div className="space-y-4">
          {showSavedView ? (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Datos guardados</p>

                <button
                  onClick={() => {
                    setEditing(true);
                    setDirty(false);
                    dirtyRef.current = false;
                    if (savedData) setFormData(savedData);
                  }}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  type="button"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-3">
                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                  <span className="block text-xs font-medium text-gray-500">
                    Tipo
                  </span>
                  <span className="text-sm text-gray-900">
                    {savedData?.personType === 'natural'
                      ? 'Persona Natural'
                      : 'Persona Jurídica'}
                  </span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                  <span className="block text-xs font-medium text-gray-500">
                    Documento
                  </span>
                  <span className="text-sm text-gray-900">
                    {savedData?.documentType} - {savedData?.documentNumber}
                  </span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:col-span-2">
                  <span className="block text-xs font-medium text-gray-500">
                    Nombre / Razón Social
                  </span>
                  <span className="text-sm text-gray-900">
                  {savedData?.businessName}
                  </span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:col-span-2">
                  <span className="block text-xs font-medium text-gray-500">
                    Dirección
                  </span>
                  <span className="text-sm text-gray-900">
                    {savedData?.address}
                  </span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                  <span className="block text-xs font-medium text-gray-500">
                    Ciudad
                  </span>
                  <span className="text-sm text-gray-900">
                    {savedData?.city}
                  </span>
                </div>

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                  <span className="block text-xs font-medium text-gray-500">
                    Departamento
                  </span>
                  <span className="text-sm text-gray-900">
                    {savedData?.department}
                  </span>
                </div>

                {savedData?.phone && (
                  <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                    <span className="block text-xs font-medium text-gray-500">
                      Teléfono
                    </span>
                    <span className="text-sm text-gray-900">
                      {savedData.phone}
                    </span>
                  </div>
                )}

                {savedData?.regime && (
                  <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                    <span className="block text-xs font-medium text-gray-500">
                      Régimen
                    </span>
                    <span className="text-sm text-gray-900">
                      {savedData.regime}
                    </span>
                  </div>
                )}

                <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
                  <span className="block text-xs font-medium text-gray-500">
                    Email
                  </span>
                  <span className="text-sm text-gray-900 break-words">
                    {savedData?.email}
                  </span>
                </div>

              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Person Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de Persona *
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="personType"
                      value="natural"
                      checked={formData.personType === 'natural'}
                      onChange={(e) => {
                        markDirty();
                        setFormData((prev) => ({
                          ...prev,
                          personType: e.target.value as 'natural' | 'juridica',
                          regime: '', // Clear regime when switching
                        }));
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Persona Natural</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="personType"
                      value="juridica"
                      checked={formData.personType === 'juridica'}
                      onChange={(e) => {
                        markDirty();
                        setFormData((prev) => ({
                          ...prev,
                          personType: e.target.value as 'natural' | 'juridica',
                        }));
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Persona Jurídica</span>
                  </label>
                </div>
              </div>

              {/* Document Type and Number */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo de Documento *
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => {
                      markDirty();
                      setFormData((prev) => ({
                        ...prev,
                        documentType: e.target.value as 'NIT' | 'CC' | 'CE' | 'PP' | 'TI',
                      }));
                    }}
                    className="input w-full"
                    required
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="PP">Pasaporte</option>
                    <option value="TI">Tarjeta de Identidad</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => {
                      markDirty();
                      setFormData((prev) => ({ ...prev, documentNumber: e.target.value }));
                    }}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {formData.personType === 'natural' ? 'Nombre Completo *' : 'Razón Social *'}
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => {
                    markDirty();
                    setFormData((prev) => ({ ...prev, businessName: e.target.value }));
                  }}
                  className="input w-full"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => {
                    markDirty();
                    setFormData((prev) => ({ ...prev, address: e.target.value }));
                  }}
                  className="input w-full"
                  required
                />
              </div>

              {/* Department and City */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Departamento *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      markDirty();
                      const dept = e.target.value;

                      setFormData((prev) => ({
                        ...prev,
                        department: dept,
                        city: '', // Reset city when department changes
                      }));
                    }}
                    className="input w-full"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {COLOMBIAN_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Ciudad *
                  </label>

                  {availableCities.length > 0 ? (
                    <select
                      value={formData.city}
                      onChange={(e) => {
                        markDirty();
                        setFormData((prev) => ({ ...prev, city: e.target.value }));
                      }}
                      className="input w-full"
                      required
                    >
                      <option value="">Seleccionar</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => {
                        markDirty();
                        setFormData((prev) => ({ ...prev, city: e.target.value }));
                      }}
                      className="input w-full"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Phone and Email */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => {
                      markDirty();
                      setFormData((prev) => ({ ...prev, phone: e.target.value }));
                    }}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      markDirty();
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                    }}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              {/* Regime (only for juridica) */}
              {formData.personType === 'juridica' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Régimen Tributario
                  </label>
                  <input
                    type="text"
                    value={formData.regime || ''}
                    onChange={(e) => {
                      markDirty();
                      setFormData((prev) => ({ ...prev, regime: e.target.value }));
                    }}
                    className="input w-full"
                    placeholder="Ej: Régimen Simplificado, Régimen Común"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !isFormValid()}
                  className="btn-primary w-full sm:flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Datos'
                  )}
                </button>

                {(savedData || editing) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(false);
                      dirtyRef.current = false;

                      if (savedData) {
                        setFormData(savedData);
                        setEditing(false);
                      } else {
                        // Si no hay savedData, “cancelar” deja el formulario en blanco pero no cierra needsInvoice
                        setFormData({
                          personType: 'natural',
                          documentType: 'CC',
                          documentNumber: '',
                          businessName: '',
                          address: '',
                          city: '',
                          department: '',
                          phone: '',
                          email: '',
                          regime: '',
                        });
                      }
                    }}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </button>
                )}
              </div>

              {/* Hint visual opcional */}
              {dirty && (
                <p className="text-xs text-gray-500">
                  Tienes cambios sin guardar.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
