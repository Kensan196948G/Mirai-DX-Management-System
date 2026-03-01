import React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Project } from '@/types';

import { useCreateProject, useUpdateProject } from '../hooks/useProjects';

const schema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です'),
  clientName: z.string().min(1, '施主名は必須です'),
  clientType: z.enum(['public', 'private']),
  constructionType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  project?: Project;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project, onSuccess, onCancel }) => {
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(project?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? '',
      clientName: project?.clientName ?? '',
      clientType: project?.clientType ?? 'public',
      constructionType: project?.constructionType ?? '',
      startDate: project?.startDate ?? '',
      endDate: project?.endDate ?? '',
      location: project?.location ?? '',
    },
  });

  const onSubmit = (values: FormValues) => {
    if (project?.id) {
      updateProject(values, { onSuccess });
    } else {
      createProject(values, { onSuccess });
    }
  };

  const isPending = isCreating || isUpdating;
  const isEdit = !!project?.id;

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'mt-1 text-xs text-red-500';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={labelClass}>
          プロジェクト名 <span className="text-red-500">*</span>
        </label>
        <input type="text" {...register('name')} className={inputClass} placeholder="例: ○○ビル新築工事" />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelClass}>
          施主名 <span className="text-red-500">*</span>
        </label>
        <input type="text" {...register('clientName')} className={inputClass} placeholder="例: 株式会社○○" />
        {errors.clientName && <p className={errorClass}>{errors.clientName.message}</p>}
      </div>

      <div>
        <label className={labelClass}>発注者区分</label>
        <select {...register('clientType')} className={inputClass}>
          <option value="public">公共</option>
          <option value="private">民間</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>工事種別</label>
        <input
          type="text"
          {...register('constructionType')}
          className={inputClass}
          placeholder="例: 建築工事"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>開始日</label>
          <input type="date" {...register('startDate')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>終了日</label>
          <input type="date" {...register('endDate')} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>工事場所</label>
        <input
          type="text"
          {...register('location')}
          className={inputClass}
          placeholder="例: 東京都千代田区○○"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '保存中...' : isEdit ? '更新' : '作成'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
