import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AuthResponse, Batch, BatchInput, BatchListResponse, Branch, BranchDashboard, BranchInput, BranchStockSummary, DailySummary, DashboardAlerts, DashboardOverview, ExpiringMedicine, GetDailySummaryParams, GetDashboardAlertsParams, GetDashboardOverviewParams, GetExpiringMedicinesParams, GetInventoryOverviewParams, GetLowStockMedicinesParams, GetPayablesAgingParams, GetPrescriptionStatsParams, GetReorderSuggestionsParams, GetRevenueTrendParams, GetSalesKpisParams, GetStockValuationParams, GetTopMedicinesParams, Grn, GrnInput, HealthStatus, InventoryItem, ListBatchesParams, ListBranchesParams, ListGrnsParams, ListHeldSalesParams, ListMedicinesParams, ListPatientsParams, ListPrescriptionsParams, ListPurchaseOrdersParams, ListSalesParams, ListStockAdjustmentsParams, ListSuppliersParams, ListUsersParams, LoginInput, LogoutInput, LowStockMedicine, Medicine, MedicineCategory, MedicineInput, MedicineListResponse, MedicineUpdate, MessageResponse, Patient, PatientInput, PatientListResponse, PatientUpdate, PayablesAging, Prescription, PrescriptionDispenseInput, PrescriptionInput, PrescriptionListResponse, PrescriptionStats, PrescriptionVerifyInput, PurchaseOrder, PurchaseOrderInput, PurchaseOrderListResponse, RefundInput, ReorderSuggestion, RevenueTrendPoint, Sale, SaleCalculation, SaleInput, SaleListResponse, SaleResponse, SalesKpis, SearchMedicinesParams, SearchPatientsParams, StockAdjustment, StockAdjustmentInput, StockValuation, Supplier, SupplierInput, SupplierListResponse, SupplierUpdate, TopMedicine, User, UserInput, UserListResponse, UserProfile, UserStatusUpdate, UserUpdate } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLoginUrl: () => string;
/**
 * @summary Login
 */
export declare const login: (loginInput: LoginInput, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginInput>;
export type LoginMutationError = ErrorType<unknown>;
/**
* @summary Login
*/
export declare const useLogin: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export declare const getLogoutUrl: () => string;
/**
 * @summary Logout
 */
export declare const logout: (logoutInput: LogoutInput, options?: RequestInit) => Promise<MessageResponse>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, {
        data: BodyType<LogoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, {
    data: BodyType<LogoutInput>;
}, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationBody = BodyType<LogoutInput>;
export type LogoutMutationError = ErrorType<unknown>;
/**
* @summary Logout
*/
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, {
        data: BodyType<LogoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, {
    data: BodyType<LogoutInput>;
}, TContext>;
export declare const getGetCurrentUserUrl: () => string;
/**
 * @summary Get current user profile
 */
export declare const getCurrentUser: (options?: RequestInit) => Promise<UserProfile>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = ErrorType<unknown>;
/**
 * @summary Get current user profile
 */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListUsersUrl: (params?: ListUsersParams) => string;
/**
 * @summary List users
 */
export declare const listUsers: (params?: ListUsersParams, options?: RequestInit) => Promise<UserListResponse>;
export declare const getListUsersQueryKey: (params?: ListUsersParams) => readonly ["/api/users", ...ListUsersParams[]];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List users
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(params?: ListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateUserUrl: () => string;
/**
 * @summary Create user
 */
export declare const createUser: (userInput: UserInput, options?: RequestInit) => Promise<User>;
export declare const getCreateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<UserInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<UserInput>;
}, TContext>;
export type CreateUserMutationResult = NonNullable<Awaited<ReturnType<typeof createUser>>>;
export type CreateUserMutationBody = BodyType<UserInput>;
export type CreateUserMutationError = ErrorType<unknown>;
/**
* @summary Create user
*/
export declare const useCreateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createUser>>, TError, {
        data: BodyType<UserInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createUser>>, TError, {
    data: BodyType<UserInput>;
}, TContext>;
export declare const getGetUserUrl: (userId: string) => string;
/**
 * @summary Get user
 */
export declare const getUser: (userId: string, options?: RequestInit) => Promise<User>;
export declare const getGetUserQueryKey: (userId: string) => readonly [`/api/users/${string}`];
export declare const getGetUserQueryOptions: <TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(userId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserQueryResult = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export type GetUserQueryError = ErrorType<unknown>;
/**
 * @summary Get user
 */
export declare function useGetUser<TData = Awaited<ReturnType<typeof getUser>>, TError = ErrorType<unknown>>(userId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateUserUrl: (userId: string) => string;
/**
 * @summary Update user
 */
export declare const updateUser: (userId: string, userUpdate: UserUpdate, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        userId: string;
        data: BodyType<UserUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
    userId: string;
    data: BodyType<UserUpdate>;
}, TContext>;
export type UpdateUserMutationResult = NonNullable<Awaited<ReturnType<typeof updateUser>>>;
export type UpdateUserMutationBody = BodyType<UserUpdate>;
export type UpdateUserMutationError = ErrorType<unknown>;
/**
* @summary Update user
*/
export declare const useUpdateUser: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUser>>, TError, {
        userId: string;
        data: BodyType<UserUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUser>>, TError, {
    userId: string;
    data: BodyType<UserUpdate>;
}, TContext>;
export declare const getUpdateUserStatusUrl: (userId: string) => string;
/**
 * @summary Activate / deactivate user
 */
export declare const updateUserStatus: (userId: string, userStatusUpdate: UserStatusUpdate, options?: RequestInit) => Promise<User>;
export declare const getUpdateUserStatusMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserStatus>>, TError, {
        userId: string;
        data: BodyType<UserStatusUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUserStatus>>, TError, {
    userId: string;
    data: BodyType<UserStatusUpdate>;
}, TContext>;
export type UpdateUserStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserStatus>>>;
export type UpdateUserStatusMutationBody = BodyType<UserStatusUpdate>;
export type UpdateUserStatusMutationError = ErrorType<unknown>;
/**
* @summary Activate / deactivate user
*/
export declare const useUpdateUserStatus: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserStatus>>, TError, {
        userId: string;
        data: BodyType<UserStatusUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUserStatus>>, TError, {
    userId: string;
    data: BodyType<UserStatusUpdate>;
}, TContext>;
export declare const getListBranchesUrl: (params?: ListBranchesParams) => string;
/**
 * @summary List branches
 */
export declare const listBranches: (params?: ListBranchesParams, options?: RequestInit) => Promise<Branch[]>;
export declare const getListBranchesQueryKey: (params?: ListBranchesParams) => readonly ["/api/branches", ...ListBranchesParams[]];
export declare const getListBranchesQueryOptions: <TData = Awaited<ReturnType<typeof listBranches>>, TError = ErrorType<unknown>>(params?: ListBranchesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBranchesQueryResult = NonNullable<Awaited<ReturnType<typeof listBranches>>>;
export type ListBranchesQueryError = ErrorType<unknown>;
/**
 * @summary List branches
 */
export declare function useListBranches<TData = Awaited<ReturnType<typeof listBranches>>, TError = ErrorType<unknown>>(params?: ListBranchesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBranchUrl: () => string;
/**
 * @summary Create branch
 */
export declare const createBranch: (branchInput: BranchInput, options?: RequestInit) => Promise<Branch>;
export declare const getCreateBranchMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError, {
        data: BodyType<BranchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError, {
    data: BodyType<BranchInput>;
}, TContext>;
export type CreateBranchMutationResult = NonNullable<Awaited<ReturnType<typeof createBranch>>>;
export type CreateBranchMutationBody = BodyType<BranchInput>;
export type CreateBranchMutationError = ErrorType<unknown>;
/**
* @summary Create branch
*/
export declare const useCreateBranch: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError, {
        data: BodyType<BranchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBranch>>, TError, {
    data: BodyType<BranchInput>;
}, TContext>;
export declare const getGetBranchUrl: (branchId: string) => string;
/**
 * @summary Get branch
 */
export declare const getBranch: (branchId: string, options?: RequestInit) => Promise<Branch>;
export declare const getGetBranchQueryKey: (branchId: string) => readonly [`/api/branches/${string}`];
export declare const getGetBranchQueryOptions: <TData = Awaited<ReturnType<typeof getBranch>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBranch>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBranchQueryResult = NonNullable<Awaited<ReturnType<typeof getBranch>>>;
export type GetBranchQueryError = ErrorType<unknown>;
/**
 * @summary Get branch
 */
export declare function useGetBranch<TData = Awaited<ReturnType<typeof getBranch>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetBranchDashboardUrl: (branchId: string) => string;
/**
 * @summary Get branch dashboard KPIs
 */
export declare const getBranchDashboard: (branchId: string, options?: RequestInit) => Promise<BranchDashboard>;
export declare const getGetBranchDashboardQueryKey: (branchId: string) => readonly [`/api/branches/${string}/dashboard`];
export declare const getGetBranchDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getBranchDashboard>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranchDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBranchDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBranchDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getBranchDashboard>>>;
export type GetBranchDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Get branch dashboard KPIs
 */
export declare function useGetBranchDashboard<TData = Awaited<ReturnType<typeof getBranchDashboard>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranchDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetBranchStockSummaryUrl: (branchId: string) => string;
/**
 * @summary Get branch stock summary
 */
export declare const getBranchStockSummary: (branchId: string, options?: RequestInit) => Promise<BranchStockSummary>;
export declare const getGetBranchStockSummaryQueryKey: (branchId: string) => readonly [`/api/branches/${string}/stock-summary`];
export declare const getGetBranchStockSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getBranchStockSummary>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranchStockSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBranchStockSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBranchStockSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getBranchStockSummary>>>;
export type GetBranchStockSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get branch stock summary
 */
export declare function useGetBranchStockSummary<TData = Awaited<ReturnType<typeof getBranchStockSummary>>, TError = ErrorType<unknown>>(branchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBranchStockSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMedicinesUrl: (params?: ListMedicinesParams) => string;
/**
 * @summary List medicines
 */
export declare const listMedicines: (params?: ListMedicinesParams, options?: RequestInit) => Promise<MedicineListResponse>;
export declare const getListMedicinesQueryKey: (params?: ListMedicinesParams) => readonly ["/api/medicines", ...ListMedicinesParams[]];
export declare const getListMedicinesQueryOptions: <TData = Awaited<ReturnType<typeof listMedicines>>, TError = ErrorType<unknown>>(params?: ListMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMedicines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMedicinesQueryResult = NonNullable<Awaited<ReturnType<typeof listMedicines>>>;
export type ListMedicinesQueryError = ErrorType<unknown>;
/**
 * @summary List medicines
 */
export declare function useListMedicines<TData = Awaited<ReturnType<typeof listMedicines>>, TError = ErrorType<unknown>>(params?: ListMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateMedicineUrl: () => string;
/**
 * @summary Create medicine
 */
export declare const createMedicine: (medicineInput: MedicineInput, options?: RequestInit) => Promise<Medicine>;
export declare const getCreateMedicineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMedicine>>, TError, {
        data: BodyType<MedicineInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMedicine>>, TError, {
    data: BodyType<MedicineInput>;
}, TContext>;
export type CreateMedicineMutationResult = NonNullable<Awaited<ReturnType<typeof createMedicine>>>;
export type CreateMedicineMutationBody = BodyType<MedicineInput>;
export type CreateMedicineMutationError = ErrorType<unknown>;
/**
* @summary Create medicine
*/
export declare const useCreateMedicine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMedicine>>, TError, {
        data: BodyType<MedicineInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMedicine>>, TError, {
    data: BodyType<MedicineInput>;
}, TContext>;
export declare const getSearchMedicinesUrl: (params?: SearchMedicinesParams) => string;
/**
 * @summary Search medicines
 */
export declare const searchMedicines: (params?: SearchMedicinesParams, options?: RequestInit) => Promise<Medicine[]>;
export declare const getSearchMedicinesQueryKey: (params?: SearchMedicinesParams) => readonly ["/api/medicines/search", ...SearchMedicinesParams[]];
export declare const getSearchMedicinesQueryOptions: <TData = Awaited<ReturnType<typeof searchMedicines>>, TError = ErrorType<unknown>>(params?: SearchMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof searchMedicines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchMedicinesQueryResult = NonNullable<Awaited<ReturnType<typeof searchMedicines>>>;
export type SearchMedicinesQueryError = ErrorType<unknown>;
/**
 * @summary Search medicines
 */
export declare function useSearchMedicines<TData = Awaited<ReturnType<typeof searchMedicines>>, TError = ErrorType<unknown>>(params?: SearchMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLowStockMedicinesUrl: (params?: GetLowStockMedicinesParams) => string;
/**
 * @summary Get low-stock medicines
 */
export declare const getLowStockMedicines: (params?: GetLowStockMedicinesParams, options?: RequestInit) => Promise<LowStockMedicine[]>;
export declare const getGetLowStockMedicinesQueryKey: (params?: GetLowStockMedicinesParams) => readonly ["/api/medicines/low-stock", ...GetLowStockMedicinesParams[]];
export declare const getGetLowStockMedicinesQueryOptions: <TData = Awaited<ReturnType<typeof getLowStockMedicines>>, TError = ErrorType<unknown>>(params?: GetLowStockMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLowStockMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLowStockMedicines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLowStockMedicinesQueryResult = NonNullable<Awaited<ReturnType<typeof getLowStockMedicines>>>;
export type GetLowStockMedicinesQueryError = ErrorType<unknown>;
/**
 * @summary Get low-stock medicines
 */
export declare function useGetLowStockMedicines<TData = Awaited<ReturnType<typeof getLowStockMedicines>>, TError = ErrorType<unknown>>(params?: GetLowStockMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLowStockMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetExpiringMedicinesUrl: (params?: GetExpiringMedicinesParams) => string;
/**
 * @summary Get expiring-soon medicines
 */
export declare const getExpiringMedicines: (params?: GetExpiringMedicinesParams, options?: RequestInit) => Promise<ExpiringMedicine[]>;
export declare const getGetExpiringMedicinesQueryKey: (params?: GetExpiringMedicinesParams) => readonly ["/api/medicines/expiring-soon", ...GetExpiringMedicinesParams[]];
export declare const getGetExpiringMedicinesQueryOptions: <TData = Awaited<ReturnType<typeof getExpiringMedicines>>, TError = ErrorType<unknown>>(params?: GetExpiringMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExpiringMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getExpiringMedicines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetExpiringMedicinesQueryResult = NonNullable<Awaited<ReturnType<typeof getExpiringMedicines>>>;
export type GetExpiringMedicinesQueryError = ErrorType<unknown>;
/**
 * @summary Get expiring-soon medicines
 */
export declare function useGetExpiringMedicines<TData = Awaited<ReturnType<typeof getExpiringMedicines>>, TError = ErrorType<unknown>>(params?: GetExpiringMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getExpiringMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMedicineCategoriesUrl: () => string;
/**
 * @summary Get medicine categories
 */
export declare const getMedicineCategories: (options?: RequestInit) => Promise<MedicineCategory[]>;
export declare const getGetMedicineCategoriesQueryKey: () => readonly ["/api/medicines/categories"];
export declare const getGetMedicineCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof getMedicineCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMedicineCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMedicineCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMedicineCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof getMedicineCategories>>>;
export type GetMedicineCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary Get medicine categories
 */
export declare function useGetMedicineCategories<TData = Awaited<ReturnType<typeof getMedicineCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMedicineCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMedicineUrl: (medicineId: string) => string;
/**
 * @summary Get medicine detail
 */
export declare const getMedicine: (medicineId: string, options?: RequestInit) => Promise<Medicine>;
export declare const getGetMedicineQueryKey: (medicineId: string) => readonly [`/api/medicines/${string}`];
export declare const getGetMedicineQueryOptions: <TData = Awaited<ReturnType<typeof getMedicine>>, TError = ErrorType<unknown>>(medicineId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMedicine>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMedicine>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMedicineQueryResult = NonNullable<Awaited<ReturnType<typeof getMedicine>>>;
export type GetMedicineQueryError = ErrorType<unknown>;
/**
 * @summary Get medicine detail
 */
export declare function useGetMedicine<TData = Awaited<ReturnType<typeof getMedicine>>, TError = ErrorType<unknown>>(medicineId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMedicine>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateMedicineUrl: (medicineId: string) => string;
/**
 * @summary Update medicine
 */
export declare const updateMedicine: (medicineId: string, medicineUpdate: MedicineUpdate, options?: RequestInit) => Promise<Medicine>;
export declare const getUpdateMedicineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMedicine>>, TError, {
        medicineId: string;
        data: BodyType<MedicineUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMedicine>>, TError, {
    medicineId: string;
    data: BodyType<MedicineUpdate>;
}, TContext>;
export type UpdateMedicineMutationResult = NonNullable<Awaited<ReturnType<typeof updateMedicine>>>;
export type UpdateMedicineMutationBody = BodyType<MedicineUpdate>;
export type UpdateMedicineMutationError = ErrorType<unknown>;
/**
* @summary Update medicine
*/
export declare const useUpdateMedicine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMedicine>>, TError, {
        medicineId: string;
        data: BodyType<MedicineUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMedicine>>, TError, {
    medicineId: string;
    data: BodyType<MedicineUpdate>;
}, TContext>;
export declare const getDeactivateMedicineUrl: (medicineId: string) => string;
/**
 * @summary Deactivate medicine
 */
export declare const deactivateMedicine: (medicineId: string, options?: RequestInit) => Promise<MessageResponse>;
export declare const getDeactivateMedicineMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deactivateMedicine>>, TError, {
        medicineId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deactivateMedicine>>, TError, {
    medicineId: string;
}, TContext>;
export type DeactivateMedicineMutationResult = NonNullable<Awaited<ReturnType<typeof deactivateMedicine>>>;
export type DeactivateMedicineMutationError = ErrorType<unknown>;
/**
* @summary Deactivate medicine
*/
export declare const useDeactivateMedicine: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deactivateMedicine>>, TError, {
        medicineId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deactivateMedicine>>, TError, {
    medicineId: string;
}, TContext>;
export declare const getGetInventoryOverviewUrl: (params?: GetInventoryOverviewParams) => string;
/**
 * @summary Get inventory overview
 */
export declare const getInventoryOverview: (params?: GetInventoryOverviewParams, options?: RequestInit) => Promise<InventoryItem[]>;
export declare const getGetInventoryOverviewQueryKey: (params?: GetInventoryOverviewParams) => readonly ["/api/inventory", ...GetInventoryOverviewParams[]];
export declare const getGetInventoryOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getInventoryOverview>>, TError = ErrorType<unknown>>(params?: GetInventoryOverviewParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInventoryOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getInventoryOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetInventoryOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getInventoryOverview>>>;
export type GetInventoryOverviewQueryError = ErrorType<unknown>;
/**
 * @summary Get inventory overview
 */
export declare function useGetInventoryOverview<TData = Awaited<ReturnType<typeof getInventoryOverview>>, TError = ErrorType<unknown>>(params?: GetInventoryOverviewParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInventoryOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListBatchesUrl: (params?: ListBatchesParams) => string;
/**
 * @summary List batches
 */
export declare const listBatches: (params?: ListBatchesParams, options?: RequestInit) => Promise<BatchListResponse>;
export declare const getListBatchesQueryKey: (params?: ListBatchesParams) => readonly ["/api/inventory/batches", ...ListBatchesParams[]];
export declare const getListBatchesQueryOptions: <TData = Awaited<ReturnType<typeof listBatches>>, TError = ErrorType<unknown>>(params?: ListBatchesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBatches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBatchesQueryResult = NonNullable<Awaited<ReturnType<typeof listBatches>>>;
export type ListBatchesQueryError = ErrorType<unknown>;
/**
 * @summary List batches
 */
export declare function useListBatches<TData = Awaited<ReturnType<typeof listBatches>>, TError = ErrorType<unknown>>(params?: ListBatchesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBatchUrl: () => string;
/**
 * @summary Create batch
 */
export declare const createBatch: (batchInput: BatchInput, options?: RequestInit) => Promise<Batch>;
export declare const getCreateBatchMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBatch>>, TError, {
        data: BodyType<BatchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBatch>>, TError, {
    data: BodyType<BatchInput>;
}, TContext>;
export type CreateBatchMutationResult = NonNullable<Awaited<ReturnType<typeof createBatch>>>;
export type CreateBatchMutationBody = BodyType<BatchInput>;
export type CreateBatchMutationError = ErrorType<unknown>;
/**
* @summary Create batch
*/
export declare const useCreateBatch: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBatch>>, TError, {
        data: BodyType<BatchInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBatch>>, TError, {
    data: BodyType<BatchInput>;
}, TContext>;
export declare const getCreateStockAdjustmentUrl: () => string;
/**
 * @summary Create stock adjustment
 */
export declare const createStockAdjustment: (stockAdjustmentInput: StockAdjustmentInput, options?: RequestInit) => Promise<StockAdjustment>;
export declare const getCreateStockAdjustmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStockAdjustment>>, TError, {
        data: BodyType<StockAdjustmentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStockAdjustment>>, TError, {
    data: BodyType<StockAdjustmentInput>;
}, TContext>;
export type CreateStockAdjustmentMutationResult = NonNullable<Awaited<ReturnType<typeof createStockAdjustment>>>;
export type CreateStockAdjustmentMutationBody = BodyType<StockAdjustmentInput>;
export type CreateStockAdjustmentMutationError = ErrorType<unknown>;
/**
* @summary Create stock adjustment
*/
export declare const useCreateStockAdjustment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStockAdjustment>>, TError, {
        data: BodyType<StockAdjustmentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStockAdjustment>>, TError, {
    data: BodyType<StockAdjustmentInput>;
}, TContext>;
export declare const getListStockAdjustmentsUrl: (params?: ListStockAdjustmentsParams) => string;
/**
 * @summary List stock adjustments
 */
export declare const listStockAdjustments: (params?: ListStockAdjustmentsParams, options?: RequestInit) => Promise<StockAdjustment[]>;
export declare const getListStockAdjustmentsQueryKey: (params?: ListStockAdjustmentsParams) => readonly ["/api/inventory/adjustments", ...ListStockAdjustmentsParams[]];
export declare const getListStockAdjustmentsQueryOptions: <TData = Awaited<ReturnType<typeof listStockAdjustments>>, TError = ErrorType<unknown>>(params?: ListStockAdjustmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStockAdjustments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listStockAdjustments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListStockAdjustmentsQueryResult = NonNullable<Awaited<ReturnType<typeof listStockAdjustments>>>;
export type ListStockAdjustmentsQueryError = ErrorType<unknown>;
/**
 * @summary List stock adjustments
 */
export declare function useListStockAdjustments<TData = Awaited<ReturnType<typeof listStockAdjustments>>, TError = ErrorType<unknown>>(params?: ListStockAdjustmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStockAdjustments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetStockValuationUrl: (params?: GetStockValuationParams) => string;
/**
 * @summary Get stock valuation
 */
export declare const getStockValuation: (params?: GetStockValuationParams, options?: RequestInit) => Promise<StockValuation>;
export declare const getGetStockValuationQueryKey: (params?: GetStockValuationParams) => readonly ["/api/inventory/valuation", ...GetStockValuationParams[]];
export declare const getGetStockValuationQueryOptions: <TData = Awaited<ReturnType<typeof getStockValuation>>, TError = ErrorType<unknown>>(params?: GetStockValuationParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStockValuation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStockValuation>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStockValuationQueryResult = NonNullable<Awaited<ReturnType<typeof getStockValuation>>>;
export type GetStockValuationQueryError = ErrorType<unknown>;
/**
 * @summary Get stock valuation
 */
export declare function useGetStockValuation<TData = Awaited<ReturnType<typeof getStockValuation>>, TError = ErrorType<unknown>>(params?: GetStockValuationParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStockValuation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetReorderSuggestionsUrl: (params?: GetReorderSuggestionsParams) => string;
/**
 * @summary Get reorder suggestions
 */
export declare const getReorderSuggestions: (params?: GetReorderSuggestionsParams, options?: RequestInit) => Promise<ReorderSuggestion[]>;
export declare const getGetReorderSuggestionsQueryKey: (params?: GetReorderSuggestionsParams) => readonly ["/api/inventory/reorder-suggestions", ...GetReorderSuggestionsParams[]];
export declare const getGetReorderSuggestionsQueryOptions: <TData = Awaited<ReturnType<typeof getReorderSuggestions>>, TError = ErrorType<unknown>>(params?: GetReorderSuggestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReorderSuggestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getReorderSuggestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetReorderSuggestionsQueryResult = NonNullable<Awaited<ReturnType<typeof getReorderSuggestions>>>;
export type GetReorderSuggestionsQueryError = ErrorType<unknown>;
/**
 * @summary Get reorder suggestions
 */
export declare function useGetReorderSuggestions<TData = Awaited<ReturnType<typeof getReorderSuggestions>>, TError = ErrorType<unknown>>(params?: GetReorderSuggestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getReorderSuggestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListPatientsUrl: (params?: ListPatientsParams) => string;
/**
 * @summary List patients
 */
export declare const listPatients: (params?: ListPatientsParams, options?: RequestInit) => Promise<PatientListResponse>;
export declare const getListPatientsQueryKey: (params?: ListPatientsParams) => readonly ["/api/patients", ...ListPatientsParams[]];
export declare const getListPatientsQueryOptions: <TData = Awaited<ReturnType<typeof listPatients>>, TError = ErrorType<unknown>>(params?: ListPatientsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPatients>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPatients>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPatientsQueryResult = NonNullable<Awaited<ReturnType<typeof listPatients>>>;
export type ListPatientsQueryError = ErrorType<unknown>;
/**
 * @summary List patients
 */
export declare function useListPatients<TData = Awaited<ReturnType<typeof listPatients>>, TError = ErrorType<unknown>>(params?: ListPatientsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPatients>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePatientUrl: () => string;
/**
 * @summary Create patient
 */
export declare const createPatient: (patientInput: PatientInput, options?: RequestInit) => Promise<Patient>;
export declare const getCreatePatientMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPatient>>, TError, {
        data: BodyType<PatientInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPatient>>, TError, {
    data: BodyType<PatientInput>;
}, TContext>;
export type CreatePatientMutationResult = NonNullable<Awaited<ReturnType<typeof createPatient>>>;
export type CreatePatientMutationBody = BodyType<PatientInput>;
export type CreatePatientMutationError = ErrorType<unknown>;
/**
* @summary Create patient
*/
export declare const useCreatePatient: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPatient>>, TError, {
        data: BodyType<PatientInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPatient>>, TError, {
    data: BodyType<PatientInput>;
}, TContext>;
export declare const getSearchPatientsUrl: (params?: SearchPatientsParams) => string;
/**
 * @summary Search patients
 */
export declare const searchPatients: (params?: SearchPatientsParams, options?: RequestInit) => Promise<Patient[]>;
export declare const getSearchPatientsQueryKey: (params?: SearchPatientsParams) => readonly ["/api/patients/search", ...SearchPatientsParams[]];
export declare const getSearchPatientsQueryOptions: <TData = Awaited<ReturnType<typeof searchPatients>>, TError = ErrorType<unknown>>(params?: SearchPatientsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchPatients>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof searchPatients>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchPatientsQueryResult = NonNullable<Awaited<ReturnType<typeof searchPatients>>>;
export type SearchPatientsQueryError = ErrorType<unknown>;
/**
 * @summary Search patients
 */
export declare function useSearchPatients<TData = Awaited<ReturnType<typeof searchPatients>>, TError = ErrorType<unknown>>(params?: SearchPatientsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchPatients>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetPatientUrl: (patientId: string) => string;
/**
 * @summary Get patient
 */
export declare const getPatient: (patientId: string, options?: RequestInit) => Promise<Patient>;
export declare const getGetPatientQueryKey: (patientId: string) => readonly [`/api/patients/${string}`];
export declare const getGetPatientQueryOptions: <TData = Awaited<ReturnType<typeof getPatient>>, TError = ErrorType<unknown>>(patientId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPatient>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPatient>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPatientQueryResult = NonNullable<Awaited<ReturnType<typeof getPatient>>>;
export type GetPatientQueryError = ErrorType<unknown>;
/**
 * @summary Get patient
 */
export declare function useGetPatient<TData = Awaited<ReturnType<typeof getPatient>>, TError = ErrorType<unknown>>(patientId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPatient>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdatePatientUrl: (patientId: string) => string;
/**
 * @summary Update patient
 */
export declare const updatePatient: (patientId: string, patientUpdate: PatientUpdate, options?: RequestInit) => Promise<Patient>;
export declare const getUpdatePatientMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePatient>>, TError, {
        patientId: string;
        data: BodyType<PatientUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePatient>>, TError, {
    patientId: string;
    data: BodyType<PatientUpdate>;
}, TContext>;
export type UpdatePatientMutationResult = NonNullable<Awaited<ReturnType<typeof updatePatient>>>;
export type UpdatePatientMutationBody = BodyType<PatientUpdate>;
export type UpdatePatientMutationError = ErrorType<unknown>;
/**
* @summary Update patient
*/
export declare const useUpdatePatient: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePatient>>, TError, {
        patientId: string;
        data: BodyType<PatientUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePatient>>, TError, {
    patientId: string;
    data: BodyType<PatientUpdate>;
}, TContext>;
export declare const getGetPatientHistoryUrl: (patientId: string) => string;
/**
 * @summary Get patient purchase history
 */
export declare const getPatientHistory: (patientId: string, options?: RequestInit) => Promise<Sale[]>;
export declare const getGetPatientHistoryQueryKey: (patientId: string) => readonly [`/api/patients/${string}/history`];
export declare const getGetPatientHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getPatientHistory>>, TError = ErrorType<unknown>>(patientId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPatientHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPatientHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPatientHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getPatientHistory>>>;
export type GetPatientHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get patient purchase history
 */
export declare function useGetPatientHistory<TData = Awaited<ReturnType<typeof getPatientHistory>>, TError = ErrorType<unknown>>(patientId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPatientHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListPrescriptionsUrl: (params?: ListPrescriptionsParams) => string;
/**
 * @summary List prescriptions
 */
export declare const listPrescriptions: (params?: ListPrescriptionsParams, options?: RequestInit) => Promise<PrescriptionListResponse>;
export declare const getListPrescriptionsQueryKey: (params?: ListPrescriptionsParams) => readonly ["/api/prescriptions", ...ListPrescriptionsParams[]];
export declare const getListPrescriptionsQueryOptions: <TData = Awaited<ReturnType<typeof listPrescriptions>>, TError = ErrorType<unknown>>(params?: ListPrescriptionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPrescriptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPrescriptions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPrescriptionsQueryResult = NonNullable<Awaited<ReturnType<typeof listPrescriptions>>>;
export type ListPrescriptionsQueryError = ErrorType<unknown>;
/**
 * @summary List prescriptions
 */
export declare function useListPrescriptions<TData = Awaited<ReturnType<typeof listPrescriptions>>, TError = ErrorType<unknown>>(params?: ListPrescriptionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPrescriptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePrescriptionUrl: () => string;
/**
 * @summary Create prescription
 */
export declare const createPrescription: (prescriptionInput: PrescriptionInput, options?: RequestInit) => Promise<Prescription>;
export declare const getCreatePrescriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPrescription>>, TError, {
        data: BodyType<PrescriptionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPrescription>>, TError, {
    data: BodyType<PrescriptionInput>;
}, TContext>;
export type CreatePrescriptionMutationResult = NonNullable<Awaited<ReturnType<typeof createPrescription>>>;
export type CreatePrescriptionMutationBody = BodyType<PrescriptionInput>;
export type CreatePrescriptionMutationError = ErrorType<unknown>;
/**
* @summary Create prescription
*/
export declare const useCreatePrescription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPrescription>>, TError, {
        data: BodyType<PrescriptionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPrescription>>, TError, {
    data: BodyType<PrescriptionInput>;
}, TContext>;
export declare const getGetPrescriptionUrl: (prescriptionId: string) => string;
/**
 * @summary Get prescription
 */
export declare const getPrescription: (prescriptionId: string, options?: RequestInit) => Promise<Prescription>;
export declare const getGetPrescriptionQueryKey: (prescriptionId: string) => readonly [`/api/prescriptions/${string}`];
export declare const getGetPrescriptionQueryOptions: <TData = Awaited<ReturnType<typeof getPrescription>>, TError = ErrorType<unknown>>(prescriptionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPrescription>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPrescription>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPrescriptionQueryResult = NonNullable<Awaited<ReturnType<typeof getPrescription>>>;
export type GetPrescriptionQueryError = ErrorType<unknown>;
/**
 * @summary Get prescription
 */
export declare function useGetPrescription<TData = Awaited<ReturnType<typeof getPrescription>>, TError = ErrorType<unknown>>(prescriptionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPrescription>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getVerifyPrescriptionUrl: (prescriptionId: string) => string;
/**
 * @summary Verify prescription
 */
export declare const verifyPrescription: (prescriptionId: string, prescriptionVerifyInput: PrescriptionVerifyInput, options?: RequestInit) => Promise<Prescription>;
export declare const getVerifyPrescriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPrescription>>, TError, {
        prescriptionId: string;
        data: BodyType<PrescriptionVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyPrescription>>, TError, {
    prescriptionId: string;
    data: BodyType<PrescriptionVerifyInput>;
}, TContext>;
export type VerifyPrescriptionMutationResult = NonNullable<Awaited<ReturnType<typeof verifyPrescription>>>;
export type VerifyPrescriptionMutationBody = BodyType<PrescriptionVerifyInput>;
export type VerifyPrescriptionMutationError = ErrorType<unknown>;
/**
* @summary Verify prescription
*/
export declare const useVerifyPrescription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyPrescription>>, TError, {
        prescriptionId: string;
        data: BodyType<PrescriptionVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyPrescription>>, TError, {
    prescriptionId: string;
    data: BodyType<PrescriptionVerifyInput>;
}, TContext>;
export declare const getDispensePrescriptionUrl: (prescriptionId: string) => string;
/**
 * @summary Mark prescription as dispensed
 */
export declare const dispensePrescription: (prescriptionId: string, prescriptionDispenseInput: PrescriptionDispenseInput, options?: RequestInit) => Promise<Prescription>;
export declare const getDispensePrescriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dispensePrescription>>, TError, {
        prescriptionId: string;
        data: BodyType<PrescriptionDispenseInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof dispensePrescription>>, TError, {
    prescriptionId: string;
    data: BodyType<PrescriptionDispenseInput>;
}, TContext>;
export type DispensePrescriptionMutationResult = NonNullable<Awaited<ReturnType<typeof dispensePrescription>>>;
export type DispensePrescriptionMutationBody = BodyType<PrescriptionDispenseInput>;
export type DispensePrescriptionMutationError = ErrorType<unknown>;
/**
* @summary Mark prescription as dispensed
*/
export declare const useDispensePrescription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dispensePrescription>>, TError, {
        prescriptionId: string;
        data: BodyType<PrescriptionDispenseInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof dispensePrescription>>, TError, {
    prescriptionId: string;
    data: BodyType<PrescriptionDispenseInput>;
}, TContext>;
export declare const getGetPrescriptionStatsUrl: (params?: GetPrescriptionStatsParams) => string;
/**
 * @summary Get prescription statistics
 */
export declare const getPrescriptionStats: (params?: GetPrescriptionStatsParams, options?: RequestInit) => Promise<PrescriptionStats>;
export declare const getGetPrescriptionStatsQueryKey: (params?: GetPrescriptionStatsParams) => readonly ["/api/prescriptions/stats", ...GetPrescriptionStatsParams[]];
export declare const getGetPrescriptionStatsQueryOptions: <TData = Awaited<ReturnType<typeof getPrescriptionStats>>, TError = ErrorType<unknown>>(params?: GetPrescriptionStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPrescriptionStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPrescriptionStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPrescriptionStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getPrescriptionStats>>>;
export type GetPrescriptionStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get prescription statistics
 */
export declare function useGetPrescriptionStats<TData = Awaited<ReturnType<typeof getPrescriptionStats>>, TError = ErrorType<unknown>>(params?: GetPrescriptionStatsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPrescriptionStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSaleUrl: () => string;
/**
 * @summary Create sale
 */
export declare const createSale: (saleInput: SaleInput, options?: RequestInit) => Promise<SaleResponse>;
export declare const getCreateSaleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
        data: BodyType<SaleInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
    data: BodyType<SaleInput>;
}, TContext>;
export type CreateSaleMutationResult = NonNullable<Awaited<ReturnType<typeof createSale>>>;
export type CreateSaleMutationBody = BodyType<SaleInput>;
export type CreateSaleMutationError = ErrorType<unknown>;
/**
* @summary Create sale
*/
export declare const useCreateSale: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
        data: BodyType<SaleInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSale>>, TError, {
    data: BodyType<SaleInput>;
}, TContext>;
export declare const getListSalesUrl: (params?: ListSalesParams) => string;
/**
 * @summary List sales
 */
export declare const listSales: (params?: ListSalesParams, options?: RequestInit) => Promise<SaleListResponse>;
export declare const getListSalesQueryKey: (params?: ListSalesParams) => readonly ["/api/sales", ...ListSalesParams[]];
export declare const getListSalesQueryOptions: <TData = Awaited<ReturnType<typeof listSales>>, TError = ErrorType<unknown>>(params?: ListSalesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSalesQueryResult = NonNullable<Awaited<ReturnType<typeof listSales>>>;
export type ListSalesQueryError = ErrorType<unknown>;
/**
 * @summary List sales
 */
export declare function useListSales<TData = Awaited<ReturnType<typeof listSales>>, TError = ErrorType<unknown>>(params?: ListSalesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSalesKpisUrl: (params?: GetSalesKpisParams) => string;
/**
 * @summary Get sales KPIs
 */
export declare const getSalesKpis: (params?: GetSalesKpisParams, options?: RequestInit) => Promise<SalesKpis>;
export declare const getGetSalesKpisQueryKey: (params?: GetSalesKpisParams) => readonly ["/api/sales/kpis", ...GetSalesKpisParams[]];
export declare const getGetSalesKpisQueryOptions: <TData = Awaited<ReturnType<typeof getSalesKpis>>, TError = ErrorType<unknown>>(params?: GetSalesKpisParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSalesKpis>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSalesKpis>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSalesKpisQueryResult = NonNullable<Awaited<ReturnType<typeof getSalesKpis>>>;
export type GetSalesKpisQueryError = ErrorType<unknown>;
/**
 * @summary Get sales KPIs
 */
export declare function useGetSalesKpis<TData = Awaited<ReturnType<typeof getSalesKpis>>, TError = ErrorType<unknown>>(params?: GetSalesKpisParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSalesKpis>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDailySummaryUrl: (params?: GetDailySummaryParams) => string;
/**
 * @summary Get daily summary
 */
export declare const getDailySummary: (params?: GetDailySummaryParams, options?: RequestInit) => Promise<DailySummary>;
export declare const getGetDailySummaryQueryKey: (params?: GetDailySummaryParams) => readonly ["/api/sales/daily-summary", ...GetDailySummaryParams[]];
export declare const getGetDailySummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDailySummary>>, TError = ErrorType<unknown>>(params?: GetDailySummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDailySummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDailySummary>>>;
export type GetDailySummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get daily summary
 */
export declare function useGetDailySummary<TData = Awaited<ReturnType<typeof getDailySummary>>, TError = ErrorType<unknown>>(params?: GetDailySummaryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListHeldSalesUrl: (params?: ListHeldSalesParams) => string;
/**
 * @summary List held sales
 */
export declare const listHeldSales: (params?: ListHeldSalesParams, options?: RequestInit) => Promise<Sale[]>;
export declare const getListHeldSalesQueryKey: (params?: ListHeldSalesParams) => readonly ["/api/sales/held", ...ListHeldSalesParams[]];
export declare const getListHeldSalesQueryOptions: <TData = Awaited<ReturnType<typeof listHeldSales>>, TError = ErrorType<unknown>>(params?: ListHeldSalesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHeldSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listHeldSales>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListHeldSalesQueryResult = NonNullable<Awaited<ReturnType<typeof listHeldSales>>>;
export type ListHeldSalesQueryError = ErrorType<unknown>;
/**
 * @summary List held sales
 */
export declare function useListHeldSales<TData = Awaited<ReturnType<typeof listHeldSales>>, TError = ErrorType<unknown>>(params?: ListHeldSalesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listHeldSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCalculateSaleUrl: () => string;
/**
 * @summary Calculate sale totals (dry-run)
 */
export declare const calculateSale: (saleInput: SaleInput, options?: RequestInit) => Promise<SaleCalculation>;
export declare const getCalculateSaleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calculateSale>>, TError, {
        data: BodyType<SaleInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof calculateSale>>, TError, {
    data: BodyType<SaleInput>;
}, TContext>;
export type CalculateSaleMutationResult = NonNullable<Awaited<ReturnType<typeof calculateSale>>>;
export type CalculateSaleMutationBody = BodyType<SaleInput>;
export type CalculateSaleMutationError = ErrorType<unknown>;
/**
* @summary Calculate sale totals (dry-run)
*/
export declare const useCalculateSale: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof calculateSale>>, TError, {
        data: BodyType<SaleInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof calculateSale>>, TError, {
    data: BodyType<SaleInput>;
}, TContext>;
export declare const getGetSaleUrl: (saleId: string) => string;
/**
 * @summary Get sale
 */
export declare const getSale: (saleId: string, options?: RequestInit) => Promise<Sale>;
export declare const getGetSaleQueryKey: (saleId: string) => readonly [`/api/sales/${string}`];
export declare const getGetSaleQueryOptions: <TData = Awaited<ReturnType<typeof getSale>>, TError = ErrorType<unknown>>(saleId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSale>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSale>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSaleQueryResult = NonNullable<Awaited<ReturnType<typeof getSale>>>;
export type GetSaleQueryError = ErrorType<unknown>;
/**
 * @summary Get sale
 */
export declare function useGetSale<TData = Awaited<ReturnType<typeof getSale>>, TError = ErrorType<unknown>>(saleId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSale>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRefundSaleUrl: (saleId: string) => string;
/**
 * @summary Process refund
 */
export declare const refundSale: (saleId: string, refundInput: RefundInput, options?: RequestInit) => Promise<Sale>;
export declare const getRefundSaleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refundSale>>, TError, {
        saleId: string;
        data: BodyType<RefundInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof refundSale>>, TError, {
    saleId: string;
    data: BodyType<RefundInput>;
}, TContext>;
export type RefundSaleMutationResult = NonNullable<Awaited<ReturnType<typeof refundSale>>>;
export type RefundSaleMutationBody = BodyType<RefundInput>;
export type RefundSaleMutationError = ErrorType<unknown>;
/**
* @summary Process refund
*/
export declare const useRefundSale: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refundSale>>, TError, {
        saleId: string;
        data: BodyType<RefundInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof refundSale>>, TError, {
    saleId: string;
    data: BodyType<RefundInput>;
}, TContext>;
export declare const getHoldSaleUrl: (saleId: string) => string;
/**
 * @summary Hold sale
 */
export declare const holdSale: (saleId: string, options?: RequestInit) => Promise<Sale>;
export declare const getHoldSaleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof holdSale>>, TError, {
        saleId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof holdSale>>, TError, {
    saleId: string;
}, TContext>;
export type HoldSaleMutationResult = NonNullable<Awaited<ReturnType<typeof holdSale>>>;
export type HoldSaleMutationError = ErrorType<unknown>;
/**
* @summary Hold sale
*/
export declare const useHoldSale: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof holdSale>>, TError, {
        saleId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof holdSale>>, TError, {
    saleId: string;
}, TContext>;
export declare const getListSuppliersUrl: (params?: ListSuppliersParams) => string;
/**
 * @summary List suppliers
 */
export declare const listSuppliers: (params?: ListSuppliersParams, options?: RequestInit) => Promise<SupplierListResponse>;
export declare const getListSuppliersQueryKey: (params?: ListSuppliersParams) => readonly ["/api/suppliers", ...ListSuppliersParams[]];
export declare const getListSuppliersQueryOptions: <TData = Awaited<ReturnType<typeof listSuppliers>>, TError = ErrorType<unknown>>(params?: ListSuppliersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSuppliers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSuppliers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSuppliersQueryResult = NonNullable<Awaited<ReturnType<typeof listSuppliers>>>;
export type ListSuppliersQueryError = ErrorType<unknown>;
/**
 * @summary List suppliers
 */
export declare function useListSuppliers<TData = Awaited<ReturnType<typeof listSuppliers>>, TError = ErrorType<unknown>>(params?: ListSuppliersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSuppliers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSupplierUrl: () => string;
/**
 * @summary Create supplier
 */
export declare const createSupplier: (supplierInput: SupplierInput, options?: RequestInit) => Promise<Supplier>;
export declare const getCreateSupplierMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupplier>>, TError, {
        data: BodyType<SupplierInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSupplier>>, TError, {
    data: BodyType<SupplierInput>;
}, TContext>;
export type CreateSupplierMutationResult = NonNullable<Awaited<ReturnType<typeof createSupplier>>>;
export type CreateSupplierMutationBody = BodyType<SupplierInput>;
export type CreateSupplierMutationError = ErrorType<unknown>;
/**
* @summary Create supplier
*/
export declare const useCreateSupplier: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupplier>>, TError, {
        data: BodyType<SupplierInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSupplier>>, TError, {
    data: BodyType<SupplierInput>;
}, TContext>;
export declare const getGetSupplierUrl: (supplierId: string) => string;
/**
 * @summary Get supplier
 */
export declare const getSupplier: (supplierId: string, options?: RequestInit) => Promise<Supplier>;
export declare const getGetSupplierQueryKey: (supplierId: string) => readonly [`/api/suppliers/${string}`];
export declare const getGetSupplierQueryOptions: <TData = Awaited<ReturnType<typeof getSupplier>>, TError = ErrorType<unknown>>(supplierId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSupplier>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSupplier>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSupplierQueryResult = NonNullable<Awaited<ReturnType<typeof getSupplier>>>;
export type GetSupplierQueryError = ErrorType<unknown>;
/**
 * @summary Get supplier
 */
export declare function useGetSupplier<TData = Awaited<ReturnType<typeof getSupplier>>, TError = ErrorType<unknown>>(supplierId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSupplier>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateSupplierUrl: (supplierId: string) => string;
/**
 * @summary Update supplier
 */
export declare const updateSupplier: (supplierId: string, supplierUpdate: SupplierUpdate, options?: RequestInit) => Promise<Supplier>;
export declare const getUpdateSupplierMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSupplier>>, TError, {
        supplierId: string;
        data: BodyType<SupplierUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSupplier>>, TError, {
    supplierId: string;
    data: BodyType<SupplierUpdate>;
}, TContext>;
export type UpdateSupplierMutationResult = NonNullable<Awaited<ReturnType<typeof updateSupplier>>>;
export type UpdateSupplierMutationBody = BodyType<SupplierUpdate>;
export type UpdateSupplierMutationError = ErrorType<unknown>;
/**
* @summary Update supplier
*/
export declare const useUpdateSupplier: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSupplier>>, TError, {
        supplierId: string;
        data: BodyType<SupplierUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSupplier>>, TError, {
    supplierId: string;
    data: BodyType<SupplierUpdate>;
}, TContext>;
export declare const getListPurchaseOrdersUrl: (params?: ListPurchaseOrdersParams) => string;
/**
 * @summary List purchase orders
 */
export declare const listPurchaseOrders: (params?: ListPurchaseOrdersParams, options?: RequestInit) => Promise<PurchaseOrderListResponse>;
export declare const getListPurchaseOrdersQueryKey: (params?: ListPurchaseOrdersParams) => readonly ["/api/suppliers/purchase-orders", ...ListPurchaseOrdersParams[]];
export declare const getListPurchaseOrdersQueryOptions: <TData = Awaited<ReturnType<typeof listPurchaseOrders>>, TError = ErrorType<unknown>>(params?: ListPurchaseOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPurchaseOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPurchaseOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPurchaseOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof listPurchaseOrders>>>;
export type ListPurchaseOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List purchase orders
 */
export declare function useListPurchaseOrders<TData = Awaited<ReturnType<typeof listPurchaseOrders>>, TError = ErrorType<unknown>>(params?: ListPurchaseOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPurchaseOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePurchaseOrderUrl: () => string;
/**
 * @summary Create purchase order
 */
export declare const createPurchaseOrder: (purchaseOrderInput: PurchaseOrderInput, options?: RequestInit) => Promise<PurchaseOrder>;
export declare const getCreatePurchaseOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPurchaseOrder>>, TError, {
        data: BodyType<PurchaseOrderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPurchaseOrder>>, TError, {
    data: BodyType<PurchaseOrderInput>;
}, TContext>;
export type CreatePurchaseOrderMutationResult = NonNullable<Awaited<ReturnType<typeof createPurchaseOrder>>>;
export type CreatePurchaseOrderMutationBody = BodyType<PurchaseOrderInput>;
export type CreatePurchaseOrderMutationError = ErrorType<unknown>;
/**
* @summary Create purchase order
*/
export declare const useCreatePurchaseOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPurchaseOrder>>, TError, {
        data: BodyType<PurchaseOrderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPurchaseOrder>>, TError, {
    data: BodyType<PurchaseOrderInput>;
}, TContext>;
export declare const getGetPurchaseOrderUrl: (poId: string) => string;
/**
 * @summary Get purchase order
 */
export declare const getPurchaseOrder: (poId: string, options?: RequestInit) => Promise<PurchaseOrder>;
export declare const getGetPurchaseOrderQueryKey: (poId: string) => readonly [`/api/suppliers/purchase-orders/${string}`];
export declare const getGetPurchaseOrderQueryOptions: <TData = Awaited<ReturnType<typeof getPurchaseOrder>>, TError = ErrorType<unknown>>(poId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPurchaseOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPurchaseOrder>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPurchaseOrderQueryResult = NonNullable<Awaited<ReturnType<typeof getPurchaseOrder>>>;
export type GetPurchaseOrderQueryError = ErrorType<unknown>;
/**
 * @summary Get purchase order
 */
export declare function useGetPurchaseOrder<TData = Awaited<ReturnType<typeof getPurchaseOrder>>, TError = ErrorType<unknown>>(poId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPurchaseOrder>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateGrnUrl: () => string;
/**
 * @summary Create GRN (Goods Received Note)
 */
export declare const createGrn: (grnInput: GrnInput, options?: RequestInit) => Promise<Grn>;
export declare const getCreateGrnMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGrn>>, TError, {
        data: BodyType<GrnInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGrn>>, TError, {
    data: BodyType<GrnInput>;
}, TContext>;
export type CreateGrnMutationResult = NonNullable<Awaited<ReturnType<typeof createGrn>>>;
export type CreateGrnMutationBody = BodyType<GrnInput>;
export type CreateGrnMutationError = ErrorType<unknown>;
/**
* @summary Create GRN (Goods Received Note)
*/
export declare const useCreateGrn: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGrn>>, TError, {
        data: BodyType<GrnInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGrn>>, TError, {
    data: BodyType<GrnInput>;
}, TContext>;
export declare const getListGrnsUrl: (params?: ListGrnsParams) => string;
/**
 * @summary List GRNs
 */
export declare const listGrns: (params?: ListGrnsParams, options?: RequestInit) => Promise<Grn[]>;
export declare const getListGrnsQueryKey: (params?: ListGrnsParams) => readonly ["/api/suppliers/grn", ...ListGrnsParams[]];
export declare const getListGrnsQueryOptions: <TData = Awaited<ReturnType<typeof listGrns>>, TError = ErrorType<unknown>>(params?: ListGrnsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGrns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGrns>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGrnsQueryResult = NonNullable<Awaited<ReturnType<typeof listGrns>>>;
export type ListGrnsQueryError = ErrorType<unknown>;
/**
 * @summary List GRNs
 */
export declare function useListGrns<TData = Awaited<ReturnType<typeof listGrns>>, TError = ErrorType<unknown>>(params?: ListGrnsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGrns>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetPayablesAgingUrl: (params?: GetPayablesAgingParams) => string;
/**
 * @summary Get payables aging report
 */
export declare const getPayablesAging: (params?: GetPayablesAgingParams, options?: RequestInit) => Promise<PayablesAging[]>;
export declare const getGetPayablesAgingQueryKey: (params?: GetPayablesAgingParams) => readonly ["/api/suppliers/payables-aging", ...GetPayablesAgingParams[]];
export declare const getGetPayablesAgingQueryOptions: <TData = Awaited<ReturnType<typeof getPayablesAging>>, TError = ErrorType<unknown>>(params?: GetPayablesAgingParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPayablesAging>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPayablesAging>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPayablesAgingQueryResult = NonNullable<Awaited<ReturnType<typeof getPayablesAging>>>;
export type GetPayablesAgingQueryError = ErrorType<unknown>;
/**
 * @summary Get payables aging report
 */
export declare function useGetPayablesAging<TData = Awaited<ReturnType<typeof getPayablesAging>>, TError = ErrorType<unknown>>(params?: GetPayablesAgingParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPayablesAging>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDashboardOverviewUrl: (params?: GetDashboardOverviewParams) => string;
/**
 * @summary Get dashboard overview
 */
export declare const getDashboardOverview: (params?: GetDashboardOverviewParams, options?: RequestInit) => Promise<DashboardOverview>;
export declare const getGetDashboardOverviewQueryKey: (params?: GetDashboardOverviewParams) => readonly ["/api/dashboard/overview", ...GetDashboardOverviewParams[]];
export declare const getGetDashboardOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardOverview>>, TError = ErrorType<unknown>>(params?: GetDashboardOverviewParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardOverview>>>;
export type GetDashboardOverviewQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard overview
 */
export declare function useGetDashboardOverview<TData = Awaited<ReturnType<typeof getDashboardOverview>>, TError = ErrorType<unknown>>(params?: GetDashboardOverviewParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDashboardAlertsUrl: (params?: GetDashboardAlertsParams) => string;
/**
 * @summary Get dashboard alerts
 */
export declare const getDashboardAlerts: (params?: GetDashboardAlertsParams, options?: RequestInit) => Promise<DashboardAlerts>;
export declare const getGetDashboardAlertsQueryKey: (params?: GetDashboardAlertsParams) => readonly ["/api/dashboard/alerts", ...GetDashboardAlertsParams[]];
export declare const getGetDashboardAlertsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardAlerts>>, TError = ErrorType<unknown>>(params?: GetDashboardAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardAlerts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardAlertsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardAlerts>>>;
export type GetDashboardAlertsQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard alerts
 */
export declare function useGetDashboardAlerts<TData = Awaited<ReturnType<typeof getDashboardAlerts>>, TError = ErrorType<unknown>>(params?: GetDashboardAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTopMedicinesUrl: (params?: GetTopMedicinesParams) => string;
/**
 * @summary Get top-selling medicines
 */
export declare const getTopMedicines: (params?: GetTopMedicinesParams, options?: RequestInit) => Promise<TopMedicine[]>;
export declare const getGetTopMedicinesQueryKey: (params?: GetTopMedicinesParams) => readonly ["/api/dashboard/top-medicines", ...GetTopMedicinesParams[]];
export declare const getGetTopMedicinesQueryOptions: <TData = Awaited<ReturnType<typeof getTopMedicines>>, TError = ErrorType<unknown>>(params?: GetTopMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTopMedicines>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTopMedicinesQueryResult = NonNullable<Awaited<ReturnType<typeof getTopMedicines>>>;
export type GetTopMedicinesQueryError = ErrorType<unknown>;
/**
 * @summary Get top-selling medicines
 */
export declare function useGetTopMedicines<TData = Awaited<ReturnType<typeof getTopMedicines>>, TError = ErrorType<unknown>>(params?: GetTopMedicinesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopMedicines>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRevenueTrendUrl: (params?: GetRevenueTrendParams) => string;
/**
 * @summary Get revenue trend (daily for last N days)
 */
export declare const getRevenueTrend: (params?: GetRevenueTrendParams, options?: RequestInit) => Promise<RevenueTrendPoint[]>;
export declare const getGetRevenueTrendQueryKey: (params?: GetRevenueTrendParams) => readonly ["/api/dashboard/revenue-trend", ...GetRevenueTrendParams[]];
export declare const getGetRevenueTrendQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueTrend>>, TError = ErrorType<unknown>>(params?: GetRevenueTrendParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueTrend>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueTrend>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueTrendQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueTrend>>>;
export type GetRevenueTrendQueryError = ErrorType<unknown>;
/**
 * @summary Get revenue trend (daily for last N days)
 */
export declare function useGetRevenueTrend<TData = Awaited<ReturnType<typeof getRevenueTrend>>, TError = ErrorType<unknown>>(params?: GetRevenueTrendParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueTrend>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map