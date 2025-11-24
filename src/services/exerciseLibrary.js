import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';

// Default exercises for new users
export const DEFAULT_EXERCISES = [
    // Upper Body - Weighted
    { name: 'Bench Press', type: 'weighted' },
    { name: 'Incline Bench Press', type: 'weighted' },
    { name: 'Overhead Press', type: 'weighted' },
    { name: 'Dumbbell Row', type: 'weighted' },
    { name: 'Lat Pulldown', type: 'weighted' },
    { name: 'Barbell Curl', type: 'weighted' },
    { name: 'Tricep Extension', type: 'weighted' },

    // Lower Body - Weighted
    { name: 'Squat', type: 'weighted' },
    { name: 'Deadlift', type: 'weighted' },
    { name: 'Romanian Deadlift', type: 'weighted' },
    { name: 'Leg Press', type: 'weighted' },
    { name: 'Leg Curl', type: 'weighted' },

    // Bodyweight
    { name: 'Pull-ups', type: 'bodyweight' },
    { name: 'Push-ups', type: 'bodyweight' },
    { name: 'Dips', type: 'bodyweight' },
];

/**
 * Initialize exercise library for a user
 * If existingStats provided, will migrate from stats
 * Otherwise, uses default exercises
 */
export const initializeExerciseLibrary = async (userId, existingStats = {}) => {
    const exercisesRef = collection(db, 'users', userId, 'exercises');
    const batch = writeBatch(db);

    // Get exercises from stats if available, otherwise use defaults
    const exercisesToAdd = Object.keys(existingStats).length > 0
        ? Object.keys(existingStats).map(name => ({
            name,
            type: 'weighted' // Default to weighted for migrated exercises
        }))
        : DEFAULT_EXERCISES;

    // Add each exercise
    exercisesToAdd.forEach(exercise => {
        const exerciseDoc = doc(exercisesRef, exercise.name);
        batch.set(exerciseDoc, {
            name: exercise.name,
            type: exercise.type,
            createdAt: new Date()
        });
    });

    await batch.commit();
};

/**
 * Get all exercises for a user
 */
export const getExerciseLibrary = async (userId) => {
    const exercisesRef = collection(db, 'users', userId, 'exercises');
    const snapshot = await getDocs(exercisesRef);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Add a new exercise to the library
 */
export const addExercise = async (userId, name, type = 'weighted') => {
    const exerciseDoc = doc(db, 'users', userId, 'exercises', name);

    await setDoc(exerciseDoc, {
        name,
        type,
        createdAt: new Date()
    });
};

/**
 * Rename an exercise and propagate the change to all logs and stats
 */
export const renameExercise = async (userId, oldName, newName) => {
    const batch = writeBatch(db);

    // 1. Update the exercise document itself
    const oldExerciseDoc = doc(db, 'users', userId, 'exercises', oldName);
    const newExerciseDoc = doc(db, 'users', userId, 'exercises', newName);

    // Get the old exercise data
    const exercisesRef = collection(db, 'users', userId, 'exercises');
    const snapshot = await getDocs(exercisesRef);
    const oldExercise = snapshot.docs.find(d => d.id === oldName)?.data();

    if (oldExercise) {
        // Create new document with updated name
        batch.set(newExerciseDoc, {
            ...oldExercise,
            name: newName
        });

        // Delete old document
        batch.delete(oldExerciseDoc);
    }

    // 2. Update all gym logs that contain this exercise
    const logsRef = collection(db, 'users', userId, 'gym_logs');
    const logsSnapshot = await getDocs(logsRef);

    logsSnapshot.docs.forEach(logDoc => {
        const logData = logDoc.data();
        const exercises = logData.exercises || [];

        // Check if this log contains the old exercise name
        const hasExercise = exercises.some(ex => ex.exercise === oldName);

        if (hasExercise) {
            // Update the exercise name in the exercises array
            const updatedExercises = exercises.map(ex =>
                ex.exercise === oldName ? { ...ex, exercise: newName } : ex
            );

            batch.update(doc(logsRef, logDoc.id), {
                exercises: updatedExercises
            });
        }
    });

    // 3. Update stats (rename the key)
    const statsDoc = doc(db, 'users', userId, 'stats', 'exercises');
    const statsSnapshot = await getDocs(collection(db, 'users', userId, 'stats'));
    const statsData = statsSnapshot.docs.find(d => d.id === 'exercises')?.data();

    if (statsData && statsData[oldName]) {
        const updatedStats = { ...statsData };
        updatedStats[newName] = updatedStats[oldName];
        delete updatedStats[oldName];

        batch.set(statsDoc, updatedStats);
    }

    await batch.commit();
};

/**
 * Delete an exercise from the library
 * Note: This does NOT delete historical logs containing this exercise
 */
export const deleteExercise = async (userId, name) => {
    const exerciseDoc = doc(db, 'users', userId, 'exercises', name);
    await deleteDoc(exerciseDoc);
};
