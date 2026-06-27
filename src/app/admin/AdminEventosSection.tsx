"use client";

import { FormEvent, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import AddressAutocomplete, {
  type SelectedAddress,
} from "@/components/maps/AddressAutocomplete";
import MapsProvider from "@/components/maps/MapsProvider";
import { Camera, Pencil, X, Eye, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";

type EventoRow = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imageUrl: string | null;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  activo: boolean;
  canjeados: number;
  canjeadosPorLocal: Array<{ localId: string; nombre: string | null; canjeados: number }>;
  visitantesEvento: number;
  _count: { beneficios: number };
};

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

type FormMode = "create" | "edit";

function EventoForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: FormMode;
  initial?: EventoRow;
  onSuccess: (evento: EventoRow) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? "");
  const [fechaInicio, setFechaInicio] = useState(
    initial ? toDateInput(initial.fechaInicio) : "",
  );
  const [fechaFin, setFechaFin] = useState(
    initial ? toDateInput(initial.fechaFin) : "",
  );
  const [address, setAddress] = useState<SelectedAddress | null>(
    initial?.ubicacion && initial.lat != null && initial.lng != null
      ? {
          direccion: initial.ubicacion,
          lat: initial.lat,
          lng: initial.lng,
          placeId: initial.placeId ?? null,
        }
      : null,
  );
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload: Record<string, unknown> = {
      nombre,
      descripcion: descripcion || null,
      fechaInicio,
      fechaFin,
      ubicacion: address?.direccion || null,
      lat: address?.lat ?? null,
      lng: address?.lng ?? null,
      placeId: address?.placeId ?? null,
    };

    if (mode === "edit") {
      payload.activo = activo;
    }

    const url =
      mode === "create"
        ? "/api/admin/eventos"
        : `/api/admin/eventos/${initial!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al guardar evento.");
      setLoading(false);
      return;
    }

    if (imageFile) {
      const eventoId = mode === "create" ? data.id : initial!.id;
      const form = new FormData();
      form.append("image", imageFile);
      const imgRes = await fetch(`/api/admin/eventos/${eventoId}/image`, {
        method: "POST",
        body: form,
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        data.imageUrl = imgData.url;
      }
    }

    setLoading(false);

    const resultRow: EventoRow = {
      id: data.id,
      nombre: data.nombre,
      slug: data.slug,
      descripcion: data.descripcion ?? null,
      imageUrl: data.imageUrl ?? imagePreview,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      ubicacion: data.ubicacion ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      placeId: data.placeId ?? null,
      activo: data.activo ?? true,
      canjeados: initial?.canjeados ?? 0,
      canjeadosPorLocal: initial?.canjeadosPorLocal ?? [],
      visitantesEvento: initial?.visitantesEvento ?? 0,
      _count: initial?._count ?? { beneficios: 0 },
    };

    onSuccess(resultRow);
  }

  return (
    <Card className="mb-4 border-surface/80 bg-surface/95 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {mode === "create" ? "Nuevo evento" : `Editar: ${initial?.nombre}`}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <MapsProvider>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Fan Fest 2025"
            required
          />
          <Input
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción del evento"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Fecha inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
            <Input
              label="Fecha fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
            />
          </div>

          <AddressAutocomplete
            label="Ubicación"
            initialValue={initial?.ubicacion ?? ""}
            onChange={(val) => setAddress(val)}
            placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
          />

          <div>
            <p className="mb-1 text-sm font-medium text-text-primary lg:text-[13px] 2xl:text-sm">
              Imagen (opcional)
            </p>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border-default"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-4 w-4 text-white" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-muted text-text-muted hover:border-primary hover:text-primary"
                >
                  <Camera className="h-5 w-5" />
                </button>
              )}
              <div className="text-xs text-text-muted">
                JPG, PNG, WebP o GIF. Max 10MB.
                {imageFile && (
                  <span className="ml-1 font-medium text-success">
                    Imagen seleccionada
                  </span>
                )}
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivo((v) => !v)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  activo ? "bg-primary" : "bg-border-default",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    activo ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
              <span className="text-sm text-text-muted">
                {activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading}>
            {mode === "create" ? "Crear evento" : "Guardar cambios"}
          </Button>
        </form>
      </MapsProvider>
    </Card>
  );
}

export default function AdminEventosSection({
  initialEventos,
}: {
  initialEventos: EventoRow[];
}) {
  const [eventos, setEventos] = useState(initialEventos);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingEvento, setEditingEvento] = useState<EventoRow | null>(null);

  function handleCreate(evento: EventoRow) {
    setEventos((prev) => [evento, ...prev]);
    setFormMode(null);
  }

  function handleEdit(evento: EventoRow) {
    setEventos((prev) =>
      prev.map((e) => (e.id === evento.id ? evento : e)),
    );
    setFormMode(null);
    setEditingEvento(null);
  }

  function openEdit(evento: EventoRow) {
    setEditingEvento(evento);
    setFormMode("edit");
  }

  async function handleToggleActivo(evento: EventoRow) {
    const res = await fetch(`/api/admin/eventos/${evento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !evento.activo }),
    });

    if (res.ok) {
      setEventos((prev) =>
        prev.map((e) =>
          e.id === evento.id ? { ...e, activo: !e.activo } : e,
        ),
      );
    }
  }

  async function handleDelete(evento: EventoRow) {
    const confirmed = window.confirm(
      `¿Eliminar el evento "${evento.nombre}"?\n\nLos ${evento._count.beneficios} cupones vinculados pasarán a vencidos y dejarán de estar públicos.`,
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/eventos/${evento.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setEventos((prev) => prev.filter((e) => e.id !== evento.id));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Eventos
        </p>
        <Button
          size="sm"
          onClick={() => {
            if (formMode === "create") {
              setFormMode(null);
            } else {
              setEditingEvento(null);
              setFormMode("create");
            }
          }}
        >
          {formMode === "create" ? "Cancelar" : "Nuevo evento"}
        </Button>
      </div>

      {formMode === "create" && (
        <EventoForm
          mode="create"
          onSuccess={handleCreate}
          onCancel={() => setFormMode(null)}
        />
      )}

      {formMode === "edit" && editingEvento && (
        <EventoForm
          key={editingEvento.id}
          mode="edit"
          initial={editingEvento}
          onSuccess={handleEdit}
          onCancel={() => {
            setFormMode(null);
            setEditingEvento(null);
          }}
        />
      )}

      <div className="space-y-2">
        {eventos.length === 0 && (
          <p className="text-sm text-text-muted">No hay eventos creados.</p>
        )}
        {eventos.map((evento) => (
          <div
            key={evento.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-surface/70 bg-surface/70 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              {evento.imageUrl && (
                <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evento.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {evento.nombre}
                </p>
                <p className="text-xs text-text-muted">
                  {toDateInput(evento.fechaInicio)} →{" "}
                  {toDateInput(evento.fechaFin)}
                  {evento.ubicacion ? ` · ${evento.ubicacion}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="muted">
                {evento._count.beneficios} cupones
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="cursor-pointer gap-1">
                    {evento.canjeados} canjeados
                    <Eye className="h-3 w-3" />
                  </Badge>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Canjeados por local
                  </p>
                  {evento.canjeadosPorLocal.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin canjes aún.</p>
                  ) : (
                    <div className="space-y-1">
                      {evento.canjeadosPorLocal.map((row) => (
                        <div
                          key={row.localId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate pr-2 text-text-primary">
                            {row.nombre || "Local sin nombre"}
                          </span>
                          <span className="shrink-0 font-medium text-text-primary">
                            {row.canjeados}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Badge variant="light" className="gap-1">
                <Users className="h-3 w-3" />
                {evento.visitantesEvento}
              </Badge>
              <Badge variant={evento.activo ? "success" : "warning"}>
                {evento.activo ? "Activo" : "Inactivo"}
              </Badge>
              <button
                type="button"
                onClick={() => openEdit(evento)}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
                title="Editar evento"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(evento)}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                title="Eliminar evento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleActivo(evento)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  evento.activo ? "bg-primary" : "bg-border-default",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    evento.activo ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
