export interface paths {
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["webRegister"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["webLogin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Rotates the refresh token stored in the HttpOnly evry_refresh cookie. */
        post: operations["webRefresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Revokes the cookie session when present and always clears the browser refresh cookie. */
        post: operations["webLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["authenticatedUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/mobile/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["mobileLogin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/mobile/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["mobileRefresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/mobile/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["mobileLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["currentUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateCurrentUser"];
        trace?: never;
    };
    "/api/v1/exercises": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExercisesController_list"];
        put?: never;
        post: operations["ExercisesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/exercises/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ExercisesController_get"];
        put?: never;
        post?: never;
        delete: operations["ExercisesController_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["WorkoutsController_list"];
        put?: never;
        post: operations["WorkoutsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workouts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["WorkoutsController_get"];
        put?: never;
        post?: never;
        delete: operations["WorkoutsController_remove"];
        options?: never;
        head?: never;
        patch: operations["WorkoutsController_update"];
        trace?: never;
    };
    "/api/v1/workouts/{id}/finish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["WorkoutsController_finish"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workouts/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["WorkoutsController_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workouts/{id}/sets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["WorkoutsController_addSet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workouts/sets/{setId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["WorkoutsController_removeSet"];
        options?: never;
        head?: never;
        patch: operations["WorkoutsController_updateSet"];
        trace?: never;
    };
    "/api/v1/cycle/entries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CycleController_list"];
        put?: never;
        post: operations["CycleController_upsert"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cycle/today": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CycleController_today"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cycle/calendar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CycleController_calendar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cycle/entries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["CycleController_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/progress/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProgressController_overview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/progress/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProgressController_activity"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/progress/exercises/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProgressController_exerciseProgress[0]"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/progress/exercise/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProgressController_exerciseProgress[1]"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/adaptive/recommend/{exerciseId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdaptiveController_recommend"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/readiness/checkin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReadinessController_checkin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/readiness/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReadinessController_latest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/routines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["RoutinesController_list"];
        put?: never;
        post: operations["RoutinesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/routines/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["RoutinesController_get"];
        put?: never;
        post?: never;
        delete: operations["RoutinesController_remove"];
        options?: never;
        head?: never;
        patch: operations["RoutinesController_update"];
        trace?: never;
    };
    "/api/v1/routines/{id}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["RoutinesController_start"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Confirma que el proceso está vivo */
        get: operations["HealthController_live"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Confirma que el proceso y PostgreSQL están disponibles */
        get: operations["HealthController_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sync/workouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sincroniza una sesión offline de forma idempotente */
        post: operations["SyncController_workout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        RegisterInput: {
            /**
             * Format: email
             * @description Trimmed and lowercased before registration.
             */
            email: string;
            password: string;
            /** @description Leading and trailing whitespace is removed before validation. */
            name: string;
            /**
             * @description Omitted or null values use PREFER_NOT_SAY.
             * @default PREFER_NOT_SAY
             * @enum {string|null}
             */
            biologicalSex?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY" | null;
            /**
             * @description Omitted or null values disable cycle tracking.
             * @default false
             */
            trackCycle?: boolean | null;
        };
        AccessToken: {
            accessToken: string;
        };
        LoginInput: {
            /**
             * Format: email
             * @description Trimmed and lowercased before authentication.
             */
            email: string;
            password: string;
        };
        LogoutResponse: {
            /** @enum {boolean} */
            ok: true;
        };
        AuthUser: {
            id: string;
            /** Format: email */
            email: string;
            /** @enum {string} */
            biologicalSex: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY";
            trackCycle: boolean;
        };
        MobileTokens: {
            accessToken: string;
            refreshToken: string;
            /**
             * Format: date-time
             * @description Expiration of the refresh token.
             */
            expiresAt: string;
        };
        RefreshInput: {
            refreshToken: string;
        };
        User: {
            id: string;
            /** Format: email */
            email: string;
            name: string;
            /** @enum {string} */
            biologicalSex: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY";
            /** Format: date-time */
            birthDate: string | null;
            goals: ("STRENGTH" | "HYPERTROPHY" | "ENDURANCE" | "FAT_LOSS" | "GENERAL_FITNESS" | "MOBILITY")[];
            trackCycle: boolean;
            avgCycleLen: number;
            avgPeriodLen: number;
            /** Format: date-time */
            createdAt: string;
        };
        UserUpdateInput: {
            name?: string;
            /** @enum {string} */
            biologicalSex?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY";
            /** @description ISO 8601 date or date-time. Omitted or null values leave the current birth date unchanged. */
            birthDate?: string | null;
            goals?: ("STRENGTH" | "HYPERTROPHY" | "ENDURANCE" | "FAT_LOSS" | "GENERAL_FITNESS" | "MOBILITY")[];
            trackCycle?: boolean;
            avgCycleLen?: number;
            avgPeriodLen?: number;
        };
        UpdatedUser: {
            id: string;
            /** Format: email */
            email: string;
            name: string;
            /** @enum {string} */
            biologicalSex: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_SAY";
            /** Format: date-time */
            birthDate: string | null;
            goals: ("STRENGTH" | "HYPERTROPHY" | "ENDURANCE" | "FAT_LOSS" | "GENERAL_FITNESS" | "MOBILITY")[];
            trackCycle: boolean;
            avgCycleLen: number;
            avgPeriodLen: number;
        };
        ExerciseListItemDto: {
            id: string;
            sourceId: string | null;
            name: string;
            /** @enum {string} */
            muscleGroup: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
            /** @enum {string} */
            equipment: "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND" | "OTHER";
            category: string | null;
            bodyPart: string | null;
            target: string | null;
            secondaryMuscles: string[];
            equipmentLabel: string | null;
            isCustom: boolean;
            ownerId: string | null;
            isCompound: boolean;
            tags: string[];
            description: string | null;
            mediaId: string | null;
            imagePath: string | null;
            gifPath: string | null;
            attribution: string | null;
            imageUrl: string | null;
            gifUrl: string | null;
        };
        ExercisePageDto: {
            items: components["schemas"]["ExerciseListItemDto"][];
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
        ExerciseDetail: {
            id: string;
            sourceId: string | null;
            name: string;
            /** @enum {string} */
            muscleGroup: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
            /** @enum {string} */
            equipment: "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND" | "OTHER";
            category: string | null;
            bodyPart: string | null;
            target: string | null;
            secondaryMuscles: string[];
            equipmentLabel: string | null;
            isCustom: boolean;
            ownerId: string | null;
            isCompound: boolean;
            tags: string[];
            description: string | null;
            mediaId: string | null;
            imagePath: string | null;
            gifPath: string | null;
            attribution: string | null;
            instructions: ({
                [key: string]: unknown;
            } | unknown[] | string | number | boolean) | null;
            instructionSteps: ({
                [key: string]: unknown;
            } | unknown[] | string | number | boolean) | null;
            /** Format: date-time */
            createdAt: string;
            imageUrl: string | null;
            gifUrl: string | null;
        };
        CreateExerciseDto: {
            name: string;
            /** @enum {string} */
            muscleGroup: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
            /** @enum {string} */
            equipment?: "OTHER" | "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND";
            isCompound?: boolean;
            tags?: string[];
            description?: string;
        };
        Ok: {
            ok: boolean;
        };
        CreateWorkoutInput: {
            name: string;
            notes?: string;
            routineId?: string;
        };
        ExerciseEntity: {
            id: string;
            sourceId: string | null;
            name: string;
            /** @enum {string} */
            muscleGroup: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
            /** @enum {string} */
            equipment: "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND" | "OTHER";
            category: string | null;
            bodyPart: string | null;
            target: string | null;
            secondaryMuscles: string[];
            equipmentLabel: string | null;
            isCustom: boolean;
            ownerId: string | null;
            isCompound: boolean;
            tags: string[];
            description: string | null;
            mediaId: string | null;
            imagePath: string | null;
            gifPath: string | null;
            attribution: string | null;
            instructions: ({
                [key: string]: unknown;
            } | unknown[] | string | number | boolean) | null;
            instructionSteps: ({
                [key: string]: unknown;
            } | unknown[] | string | number | boolean) | null;
            /** Format: date-time */
            createdAt: string;
        };
        WorkoutSet: {
            id: string;
            workoutId: string;
            exerciseId: string;
            order: number;
            weightKg: number | null;
            reps: number | null;
            durationS: number | null;
            rpe: number | null;
            isWarmup: boolean;
            /** Format: date-time */
            completedAt: string;
            clientMutationId: string | null;
            /** Format: uuid */
            clientId: string | null;
            revision: number;
            techniqueStable: boolean | null;
            /** Format: date-time */
            updatedAt: string;
            exercise: components["schemas"]["ExerciseEntity"];
        };
        RoutineExercise: {
            id: string;
            routineId: string;
            exerciseId: string;
            order: number;
            targetSets: number;
            targetReps: number | null;
            targetWeightKg: number | null;
            /** @description JSON de objetivos por serie conservado del catálogo de rutinas; puede ser null en rutinas anteriores. */
            seriesPlan: ({
                [key: string]: unknown;
            } | unknown[] | string | number | boolean) | null;
            notes: string | null;
            exercise: components["schemas"]["ExerciseEntity"];
        };
        Routine: {
            id: string;
            userId: string;
            name: string;
            dayOfWeek: number | null;
            notes: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            exercises: components["schemas"]["RoutineExercise"][];
        };
        Workout: {
            id: string;
            userId: string;
            name: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt: string | null;
            /** Format: date-time */
            cancelledAt: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "COMPLETED" | "CANCELLED";
            /** Format: uuid */
            clientId: string | null;
            /** Format: uuid */
            lastSyncId: string | null;
            revision: number;
            /** @enum {string|null} */
            cyclePhase: "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | null;
            notes: string | null;
            routineId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            sets: components["schemas"]["WorkoutSet"][];
            routine: components["schemas"]["Routine"] | null;
        };
        UpdateWorkoutInput: {
            name?: string;
            notes?: string;
        };
        FinishWorkoutInput: {
            notes?: string;
        };
        CreateSetInput: {
            exerciseId: string;
            order: number;
            weightKg?: number;
            reps?: number;
            durationS?: number;
            rpe?: number;
            isWarmup?: boolean;
            /** Format: uuid */
            clientMutationId: string;
            techniqueStable?: boolean;
        };
        UpdateSetInput: {
            weightKg?: number | null;
            reps?: number | null;
            durationS?: number | null;
            rpe?: number | null;
            techniqueStable?: boolean | null;
            isWarmup?: boolean;
        };
        CyclePhaseInfo: {
            /** @enum {string} */
            phase: "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL";
            dayOfCycle: number;
            cycleLength: number;
            /** Format: date */
            nextPeriodStart: string | null;
            trainingHint: string;
            intensityCap: number;
            volumeCap: number;
        };
        CycleEntryInput: {
            /** Format: date */
            date: string;
            /**
             * Format: date
             * @description Fecha original cuando se mueve un registro a otro día.
             */
            previousDate?: string;
            /** @enum {string} */
            flow?: "NONE" | "SPOTTING" | "LIGHT" | "MEDIUM" | "HEAVY";
            symptoms?: string[];
            energy?: number | null;
            mood?: number | null;
            notes?: string | null;
            isPeriodStart?: boolean;
        };
        CycleEntry: {
            id: string;
            userId: string;
            /**
             * Format: date-time
             * @description Fecha civil persistida y serializada como medianoche UTC.
             */
            date: string;
            /** @enum {string} */
            flow: "NONE" | "SPOTTING" | "LIGHT" | "MEDIUM" | "HEAVY";
            symptoms: string[];
            energy: number | null;
            mood: number | null;
            notes: string | null;
            isPeriodStart: boolean;
        };
        CycleCalendar: {
            /** Format: date */
            from: string;
            /** Format: date */
            to: string;
            entries: components["schemas"]["CycleEntry"][];
            /** Format: date */
            previousPeriodStart: string | null;
        };
        DeleteCycleEntryResult: {
            /** @enum {boolean} */
            ok: true;
        };
        ProgressPeriodWindow: {
            /** @enum {string} */
            key: "30d" | "90d" | "6m" | "1y" | "all";
            /** Format: date */
            from: string | null;
            /** Format: date */
            to: string;
            /** @enum {string} */
            timezone: "America/Bogota";
        };
        OverviewMetrics: {
            sessionsCompleted: number;
            volumeKg: number;
            activeDays: number;
            weeklyFrequency: number;
        };
        OverviewMetricDelta: {
            sessionsCompleted: number;
            volumeKg: number;
            activeDays: number;
            weeklyFrequency: number;
        };
        OverviewComparison: {
            previous: components["schemas"]["OverviewMetrics"];
            delta: components["schemas"]["OverviewMetricDelta"];
        };
        ProgressRecord: {
            exerciseId: string;
            exerciseName: string;
            /** @enum {string} */
            kind: "WEIGHT" | "REPS" | "ESTIMATED_1RM";
            value: number;
            /** Format: date-time */
            achievedAt: string;
        };
        MuscleDistribution: {
            /** @enum {string} */
            muscleGroup: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
            workingSets: number;
            percentage: number;
        };
        RecentWorkoutSummary: {
            id: string;
            name: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt: string;
            setCount: number;
            volumeKg: number;
        };
        ProgressOverview: {
            period: components["schemas"]["ProgressPeriodWindow"];
            summary: components["schemas"]["OverviewMetrics"];
            comparison: components["schemas"]["OverviewComparison"] | null;
            records: components["schemas"]["ProgressRecord"][];
            muscleDistribution: components["schemas"]["MuscleDistribution"][];
            streakDays: number;
            recentWorkouts: components["schemas"]["RecentWorkoutSummary"][];
        };
        ProgressActivitySession: {
            id: string;
            name: string;
            /** Format: date-time */
            endedAt: string;
            volumeKg: number;
            setCount: number;
            /** @enum {string|null} */
            cyclePhase: "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | null;
        };
        ProgressActivityDay: {
            /** Format: date */
            date: string;
            sessions: components["schemas"]["ProgressActivitySession"][];
        };
        ProgressActivity: {
            /** Format: date */
            from: string;
            /** Format: date */
            to: string;
            days: components["schemas"]["ProgressActivityDay"][];
        };
        BestWeightRecord: {
            weightKg: number;
            /** Format: date-time */
            achievedAt: string;
            workoutId: string;
        };
        RepetitionRecord: {
            reps: number;
            weightKg: number | null;
            /** Format: date-time */
            achievedAt: string;
            workoutId: string;
        };
        Estimated1RMRecord: {
            valueKg: number;
            weightKg: number;
            reps: number;
            /** Format: date-time */
            achievedAt: string;
            workoutId: string;
            /** @enum {string} */
            formula: "EPLEY";
        };
        ExerciseProgressSummary: {
            sessionsCount: number;
            workingSetsCount: number;
            volumeKg: number;
            bestWeight: components["schemas"]["BestWeightRecord"] | null;
            repetitionRecord: components["schemas"]["RepetitionRecord"] | null;
            estimated1RM: components["schemas"]["Estimated1RMRecord"] | null;
        };
        ComparisonPeriodWindow: {
            /** Format: date */
            from: string;
            /** Format: date */
            to: string;
        };
        ExercisePeriodMetrics: {
            sessionsCount: number;
            workingSetsCount: number;
            volumeKg: number;
            bestWeightKg: number | null;
            estimated1RMKg: number | null;
        };
        ExercisePeriodMetricDelta: {
            sessionsCount: number;
            workingSetsCount: number;
            volumeKg: number;
            bestWeightKg: number | null;
            estimated1RMKg: number | null;
        };
        ExerciseProgressComparison: {
            period: components["schemas"]["ComparisonPeriodWindow"];
            previous: components["schemas"]["ExercisePeriodMetrics"];
            delta: components["schemas"]["ExercisePeriodMetricDelta"];
        };
        ExerciseProgressPoint: {
            workoutId: string;
            workoutName: string;
            /** Format: date-time */
            completedAt: string;
            maxWeightKg: number | null;
            estimated1RMKg: number | null;
            volumeKg: number;
        };
        ExerciseHistorySet: {
            id: string;
            order: number;
            weightKg: number | null;
            reps: number | null;
            durationS: number | null;
            rpe: number | null;
            /** Format: date-time */
            completedAt: string;
        };
        ExerciseHistorySession: {
            workoutId: string;
            workoutName: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt: string;
            sets: components["schemas"]["ExerciseHistorySet"][];
        };
        ExerciseProgressHistory: {
            items: components["schemas"]["ExerciseHistorySession"][];
            page: number | null;
            limit: number;
            total: number;
            hasMore: boolean;
            nextCursor: string | null;
        };
        ExerciseProgress: {
            exerciseId: string;
            period: components["schemas"]["ProgressPeriodWindow"];
            summary: components["schemas"]["ExerciseProgressSummary"];
            comparison: components["schemas"]["ExerciseProgressComparison"] | null;
            points: components["schemas"]["ExerciseProgressPoint"][];
            history: components["schemas"]["ExerciseProgressHistory"];
        };
        AdaptiveRecommendation: {
            exerciseId: string;
            targetWeightKg: number | null;
            targetReps: number | null;
            rationale: string[];
            confidence: number;
            /**
             * @description Acción emitida por el recomendador; HOLD también se usa cuando falta historial comparable.
             * @enum {string}
             */
            action: "PROGRESS" | "HOLD" | "DELOAD";
        };
        Readiness: {
            id: string;
            userId: string;
            /** Format: date-time */
            date: string;
            /**
             * Format: date-time
             * @description Fecha civil persistida y serializada como medianoche UTC; puede ser null en registros anteriores.
             */
            civilDate: string | null;
            sleepHrs: number | null;
            stress: number | null;
            soreness: number | null;
            motivation: number | null;
            score: number;
        };
        ReadinessInput: {
            sleepHrs?: number | null;
            stress?: number | null;
            soreness?: number | null;
            motivation?: number | null;
        };
        RoutineSeriesPlanDto: {
            reps?: number | null;
            weightKg?: number | null;
        };
        RoutineExerciseDto: {
            exerciseId: string;
            order: number;
            targetSets: number;
            targetReps?: number;
            targetWeightKg?: number;
            seriesPlan?: components["schemas"]["RoutineSeriesPlanDto"][];
            notes?: string;
        };
        CreateRoutineDto: {
            name: string;
            dayOfWeek?: number;
            notes?: string;
            exercises: components["schemas"]["RoutineExerciseDto"][];
        };
        UpdateRoutineDto: {
            name?: string;
            dayOfWeek?: number | null;
            notes?: string;
            exercises?: components["schemas"]["RoutineExerciseDto"][];
        };
        HealthLiveness: {
            /** @enum {string} */
            status: "ok";
        };
        HealthReadiness: {
            /** @enum {string} */
            status: "ok";
            /** @enum {string} */
            database: "ready";
        };
        SyncWorkoutSetInput: {
            /** Format: uuid */
            clientId: string;
            baseRevision: number;
            exerciseId: string;
            order: number;
            weightKg?: number | null;
            reps?: number | null;
            durationS?: number | null;
            rpe?: number | null;
            isWarmup?: boolean;
            techniqueStable?: boolean | null;
            /** Format: date-time */
            completedAt?: string | null;
        };
        SyncWorkoutInput: {
            /** Format: uuid */
            clientId: string;
            /** Format: uuid */
            syncId: string;
            baseRevision: number;
            name: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt?: string | null;
            /** Format: date-time */
            cancelledAt?: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "COMPLETED" | "CANCELLED";
            notes?: string | null;
            routineId?: string | null;
            sets: components["schemas"]["SyncWorkoutSetInput"][];
            /** Format: uuid */
            deletedSetClientIds: string[];
        };
        RoutineEntity: {
            id: string;
            userId: string;
            name: string;
            dayOfWeek: number | null;
            notes: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        SyncCanonicalWorkout: {
            id: string;
            userId: string;
            name: string;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt: string | null;
            /** Format: date-time */
            cancelledAt: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "COMPLETED" | "CANCELLED";
            /** Format: uuid */
            clientId: string | null;
            /** Format: uuid */
            lastSyncId: string | null;
            revision: number;
            /** @enum {string|null} */
            cyclePhase: "MENSTRUAL" | "FOLLICULAR" | "OVULATION" | "LUTEAL" | null;
            notes: string | null;
            routineId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            sets: components["schemas"]["WorkoutSet"][];
            routine: components["schemas"]["RoutineEntity"] | null;
        };
        SyncWorkoutIdentity: {
            /** Format: uuid */
            clientId: string | null;
            serverId: string;
        };
        SyncSetIdentity: {
            /** Format: uuid */
            clientId: string;
            serverId: string;
            revision: number;
        };
        SyncWorkoutMapping: {
            workout: components["schemas"]["SyncWorkoutIdentity"];
            sets: components["schemas"]["SyncSetIdentity"][];
        };
        SyncWorkoutResult: {
            workout: components["schemas"]["SyncCanonicalWorkout"];
            revision: number;
            mapping: components["schemas"]["SyncWorkoutMapping"];
        };
        ApiError: {
            code: string;
            message: string;
            fieldErrors?: {
                [key: string]: string[];
            };
            retryable: boolean;
            requestId: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    webRegister: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    /** @description Sets the HttpOnly evry_refresh browser session cookie. */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessToken"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Missing or untrusted browser Origin. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description The email is already registered. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    webLogin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    /** @description Sets the HttpOnly evry_refresh browser session cookie. */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessToken"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Invalid credentials. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Missing or untrusted browser Origin. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    webRefresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    /** @description Sets the HttpOnly evry_refresh browser session cookie. */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessToken"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Missing, expired or invalid browser session. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Missing or untrusted browser Origin. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    webLogout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    /** @description Clears the evry_refresh browser session cookie. */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponse"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description A token from another platform is rejected. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Missing or untrusted browser Origin. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    authenticatedUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthUser"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description A valid access token is required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    mobileLogin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobileTokens"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Invalid credentials. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    mobileRefresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MobileTokens"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Expired or invalid mobile refresh token. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    mobileLogout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponse"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description A token from another platform is rejected. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    currentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["User"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description The user profile no longer exists. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    updateCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UserUpdateInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdatedUser"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description The user profile no longer exists. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ExercisesController_list: {
        parameters: {
            query?: {
                page?: number;
                limit?: number;
                muscleGroup?: "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "FOREARMS" | "CORE" | "QUADS" | "HAMSTRINGS" | "GLUTES" | "CALVES" | "FULL_BODY" | "CARDIO";
                q?: string;
                tag?: string;
                equipment?: "OTHER" | "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "BAND";
                category?: string;
                target?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Catálogo paginado de ejercicios globales y propios. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExercisePageDto"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ExercisesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateExerciseDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseDetail"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ExercisesController_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseDetail"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ExercisesController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ok"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_list: {
        parameters: {
            query?: {
                take?: number;
                skip?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"][];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWorkoutInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Rutina no encontrada. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: true;
                    };
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateWorkoutInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_finish: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FinishWorkoutInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_addSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSetInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutSet"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_removeSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                setId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {boolean} */
                        ok: true;
                    };
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    WorkoutsController_updateSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                setId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSetInput"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutSet"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    CycleController_list: {
        parameters: {
            query?: {
                /** @description Inicio inclusivo del rango de fechas civiles. */
                from?: string;
                /** @description Fin inclusivo del rango de fechas civiles; no admite fechas futuras. */
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Hasta 180 registros, ordenados por fecha descendente. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CycleEntry"][];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    CycleController_upsert: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CycleEntryInput"];
            };
        };
        responses: {
            /** @description Registro del ciclo creado o actualizado. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CycleEntry"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    CycleController_today: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contexto estimado del ciclo, o null si no hay seguimiento voluntario o inicios registrados. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CyclePhaseInfo"] | null;
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    CycleController_calendar: {
        parameters: {
            query: {
                /** @description Inicio inclusivo; rango máximo de 62 días. */
                from: string;
                /** @description Fin inclusivo; puede ser futuro para proyecciones. */
                to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Calendario acotado con semilla del periodo anterior. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CycleCalendar"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    CycleController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Identificador del registro del ciclo. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Registro eliminado. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeleteCycleEntryResult"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description El registro no existe o no pertenece al usuario. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ProgressController_overview: {
        parameters: {
            query?: {
                period?: "30d" | "90d" | "6m" | "1y" | "all";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProgressOverview"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ProgressController_activity: {
        parameters: {
            query: {
                /** @description Inicio inclusivo del rango; máximo 62 días hasta to. */
                from: string;
                /** @description Final inclusivo; no puede superar el día actual en America/Bogota. */
                to: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProgressActivity"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    "ProgressController_exerciseProgress[0]": {
        parameters: {
            query?: {
                period?: "30d" | "90d" | "6m" | "1y" | "all";
                /** @description Cursor opaco; no combinar con page distinto de 1. */
                cursor?: string;
                page?: number;
                limit?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseProgress"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Ejercicio no encontrado. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    "ProgressController_exerciseProgress[1]": {
        parameters: {
            query?: {
                period?: "30d" | "90d" | "6m" | "1y" | "all";
                /** @description Cursor opaco; no combinar con page distinto de 1. */
                cursor?: string;
                page?: number;
                limit?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseProgress"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Ejercicio no encontrado. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    AdaptiveController_recommend: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Identificador del ejercicio para consultar el historial comparable. */
                exerciseId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Recomendación de carga y repeticiones basada en sesiones completadas y estado diario. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdaptiveRecommendation"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ReadinessController_checkin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReadinessInput"];
            };
        };
        responses: {
            /** @description Estado diario creado o actualizado para la fecha civil de hoy. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Readiness"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    ReadinessController_latest: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Estado de la fecha civil de hoy, o null si todavía no se registró. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Readiness"] | null;
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Routine"][];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRoutineDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Routine"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Routine"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Ok"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRoutineDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Routine"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    RoutinesController_start: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    HealthController_live: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description El proceso está vivo. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthLiveness"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    HealthController_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description El proceso y PostgreSQL están disponibles. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthReadiness"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description El servicio de datos no está disponible. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    SyncController_workout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SyncWorkoutInput"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SyncWorkoutResult"];
                };
            };
            /** @description Solicitud inválida. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Autenticación requerida. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Ejercicio o rutina no encontrados. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Conflicto de revisión o de sesión activa; incluye la versión canónica o null si no existe. */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"] & {
                        serverVersion: components["schemas"]["SyncCanonicalWorkout"] | null;
                    };
                };
            };
            /** @description Límite de solicitudes alcanzado. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Error interno normalizado. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
}
