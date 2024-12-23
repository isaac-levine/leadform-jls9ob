/**
 * @file FormBuilder component with drag-drop functionality and validation
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { FormState, FormField, FormFieldType } from '../../types/form.types';
import { useFormStore } from '../../store/form.store';
import { Button } from '../ui/button';
import { TextField } from './fields/TextField';
import { validateFormField } from '../../utils/validation.utils';

interface FormBuilderProps {
  onSave: (form: FormState) => Promise<void>;
  onPreview: (form: FormState) => void;
  className?: string;
  initialData?: FormState;
  validationRules?: Record<string, any>;
}

/**
 * FormBuilder component that implements drag-drop form creation with
 * real-time validation and accessibility features
 */
export const FormBuilder: React.FC<FormBuilderProps> = ({
  onSave,
  onPreview,
  className,
  initialData,
  validationRules
}) => {
  // Form store state and actions
  const {
    form,
    addField,
    updateField,
    removeField,
    reorderFields,
    setForm,
    setError,
    error
  } = useFormStore();

  // Local state for field being edited
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData, setForm]);

  /**
   * Handles adding a new field to the form
   */
  const handleAddField = useCallback(async (type: FormFieldType) => {
    try {
      const newField: FormField = {
        id: uuidv4(),
        type,
        label: `New ${type.toLowerCase()} field`,
        validation: {
          required: false
        },
        placeholder: '',
      };

      await addField(newField);
      setEditingFieldId(newField.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add field');
    }
  }, [addField, setError]);

  /**
   * Handles updating an existing field
   */
  const handleFieldUpdate = useCallback(async (
    fieldId: string,
    updates: Partial<FormField>
  ) => {
    try {
      // Validate updates before applying
      if (updates.validation) {
        const result = validateFormField(
          updates.label || '',
          updates.type || FormFieldType.TEXT,
          updates.validation
        );
        if (!result.isValid) {
          throw new Error(result.error);
        }
      }

      await updateField(fieldId, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    }
  }, [updateField, setError]);

  /**
   * Handles field reordering via drag and drop
   */
  const handleDragEnd = useCallback((result: DropResult) => {
    setIsDragging(false);

    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    reorderFields(sourceIndex, destinationIndex);

    // Announce reorder to screen readers
    const message = `Field moved from position ${sourceIndex + 1} to position ${destinationIndex + 1}`;
    const announcement = document.getElementById('drag-announcement');
    if (announcement) {
      announcement.textContent = message;
    }
  }, [reorderFields]);

  /**
   * Handles form preview
   */
  const handlePreview = useCallback(() => {
    if (!form) return;
    onPreview(form);
  }, [form, onPreview]);

  /**
   * Handles form save
   */
  const handleSave = useCallback(async () => {
    if (!form) return;
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save form');
    }
  }, [form, onSave, setError]);

  if (!form) return null;

  return (
    <div className={clsx('w-full flex flex-col gap-4', className)}>
      {/* Accessibility announcement for drag and drop */}
      <div
        id="drag-announcement"
        className="sr-only"
        role="status"
        aria-live="polite"
      />

      {/* Form Builder Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Form Builder</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            aria-label="Preview form"
          >
            Preview
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            aria-label="Save form"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="bg-error-50 text-error-500 p-3 rounded-md"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Field Type Toolbar */}
      <div className="flex gap-2 flex-wrap">
        {Object.values(FormFieldType).map((type) => (
          <Button
            key={type}
            variant="secondary"
            size="small"
            onClick={() => handleAddField(type)}
            aria-label={`Add ${type.toLowerCase()} field`}
          >
            Add {type}
          </Button>
        ))}
      </div>

      {/* Drag and Drop Form Fields */}
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <Droppable droppableId="form-fields">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={clsx(
                'min-h-[200px] border rounded-lg p-4 transition-all',
                snapshot.isDraggingOver && 'bg-primary-50',
                isDragging && 'ring-2 ring-primary-500'
              )}
            >
              {form.config.fields.map((field, index) => (
                <Draggable
                  key={field.id}
                  draggableId={field.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={clsx(
                        'bg-white shadow rounded-md p-3 mb-2',
                        'hover:shadow-md transition-shadow',
                        snapshot.isDragging && 'ring-2 ring-primary-500'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-move p-1 hover:bg-gray-100 rounded"
                          aria-label="Drag to reorder field"
                        >
                          ⋮
                        </div>

                        {/* Field Content */}
                        <div className="flex-grow">
                          <TextField
                            field={field}
                            value={field.label}
                            onChange={(value) => handleFieldUpdate(field.id, { label: value })}
                            error={error}
                          />
                        </div>

                        {/* Field Actions */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => setEditingFieldId(field.id)}
                            aria-label="Edit field"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => removeField(field.id)}
                            aria-label="Remove field"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default FormBuilder;