import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  calculateEstimator,
  matchEstimatorModel,
  normalizeModel,
  ESTIMATOR_VERSION,
  type EstimatorInput,
  type EstimatorModel,
  type RetailReference,
  type SaleObservation,
  type EstimatorResult,
} from './estimator';

export interface SavedEstimate {
  id: string;
  user_id: string;
  input: EstimatorInput;
  result: EstimatorResult;
  created_at: string;
  parent_id: string | null;
}
export interface EstimatorAccess {
  premiumEnabled: boolean;
  trialEstimateId: string | null;
  correctionUntil: string | null;
  freeAvailable: boolean;
  permanent: boolean;
  active: boolean;
  expiresAt: string | null;
}
export async function estimatorUser() {
  const client = createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return error ? null : user;
}
export const estimatorCatalogue = unstable_cache(
  async () => {
    const service = createServiceClient();
    const [models, references] = await Promise.all([
      service
        .from('estimator_models')
        .select('id,brand,name,aliases,category')
        .order('brand')
        .limit(200),
      service
        .from('estimator_retail_references')
        .select(
          'id,model_id,source_url,source_name,variant,regular_price_php,price_php,observed_at,valid_until,availability,published',
        )
        .eq('published', true)
        .order('observed_at', { ascending: false })
        .limit(500),
    ]);
    if (models.error || references.error)
      throw Error('Estimator setup is incomplete. Apply migration 059.');
    return {
      models: (models.data ?? []) as EstimatorModel[],
      references: (references.data ?? []) as RetailReference[],
    };
  },
  ['estimator-catalogue-v2'],
  { revalidate: 60, tags: ['estimator-catalogue'] },
);
export async function estimatorAccess(
  userId: string | null,
): Promise<EstimatorAccess> {
  const { data, error } = await createServiceClient().rpc('estimator_access', {
    p_user: userId,
  });
  if (error || !data) throw Error('Could not load estimator access.');
  return data as EstimatorAccess;
}
export async function createEstimate(
  userId: string,
  requestId: string,
  input: EstimatorInput,
  parentId: string | null,
) {
  const service = createServiceClient();
  const catalogue = await estimatorCatalogue();
  const model = matchEstimatorModel(input, catalogue.models);
  const sales = model
    ? await service
        .from('estimator_sale_observations')
        .select(
          'id,model_id,condition,price_php,sold_at,seller_group,provenance',
        )
        .eq('model_id', model.id)
        .eq('condition', input.condition)
        .eq('approved', true)
        .gte('sold_at', new Date(Date.now() - 180 * 86400000).toISOString())
        .order('sold_at', { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (sales.error) throw Error('Could not check resale evidence.');
  const result = calculateEstimator(
    input,
    model,
    catalogue.references,
    (sales.data ?? []) as SaleObservation[],
  );
  const identity = `${normalizeModel(input.brand)}:${model?.id ?? normalizeModel(input.model)}`;
  const saved = await service.rpc('save_estimator_estimate', {
    p_user: userId,
    p_request: requestId,
    p_identity: identity,
    p_input: input,
    p_result: result,
    p_version: ESTIMATOR_VERSION,
    p_parent: parentId,
  });
  if (saved.error)
    throw Error(
      saved.error.code === 'P0001'
        ? saved.error.message
        : 'Could not save this estimate.',
    );
  return saved.data as SavedEstimate;
}
export async function getSavedEstimate(userId: string, id: string) {
  const { data, error } = await createServiceClient()
    .from('estimator_estimates')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Error('Could not load saved estimate.');
  return data as SavedEstimate | null;
}
