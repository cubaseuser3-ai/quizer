// Quiz Storage Utility
// Automatically detects if running in Electron (uses API) or Browser (uses LocalStorage)

const isElectron = () => {
  // Check if running in Electron environment
  return window.location.protocol === 'http:' && window.location.hostname === 'localhost'
}

const API_BASE = 'http://localhost:3000/api'

// Get all quizzes
export const getQuizzes = async () => {
  if (isElectron()) {
    try {
      const response = await fetch(`${API_BASE}/quizzes`)
      if (!response.ok) throw new Error('Failed to fetch quizzes')
      return await response.json()
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      return []
    }
  } else {
    // Browser: use LocalStorage
    return JSON.parse(localStorage.getItem('quizzes') || '[]')
  }
}

// Save a quiz
export const saveQuiz = async (quiz) => {
  if (isElectron()) {
    try {
      const response = await fetch(`${API_BASE}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quiz)
      })
      if (!response.ok) throw new Error('Failed to save quiz')
      return await response.json()
    } catch (error) {
      console.error('Error saving quiz:', error)
      throw error
    }
  } else {
    // Browser: use LocalStorage
    const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    const existingIndex = quizzes.findIndex(q => q.id === quiz.id)

    if (existingIndex >= 0) {
      quizzes[existingIndex] = quiz
    } else {
      quizzes.push(quiz)
    }

    localStorage.setItem('quizzes', JSON.stringify(quizzes))
    return { success: true, id: quiz.id }
  }
}

// Update a quiz
export const updateQuiz = async (quizId, quiz) => {
  if (isElectron()) {
    try {
      const response = await fetch(`${API_BASE}/quizzes/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quiz)
      })
      if (!response.ok) throw new Error('Failed to update quiz')
      return await response.json()
    } catch (error) {
      console.error('Error updating quiz:', error)
      throw error
    }
  } else {
    // Browser: use LocalStorage
    const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    const index = quizzes.findIndex(q => q.id === quizId)

    if (index >= 0) {
      quizzes[index] = { ...quizzes[index], ...quiz }
      localStorage.setItem('quizzes', JSON.stringify(quizzes))
    }

    return { success: true, id: quizId }
  }
}

// Delete a quiz
export const deleteQuiz = async (quizId) => {
  if (isElectron()) {
    try {
      const response = await fetch(`${API_BASE}/quizzes/${quizId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete quiz')
      return await response.json()
    } catch (error) {
      console.error('Error deleting quiz:', error)
      throw error
    }
  } else {
    // Browser: use LocalStorage
    const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    const filtered = quizzes.filter(q => q.id !== quizId)
    localStorage.setItem('quizzes', JSON.stringify(filtered))
    return { success: true }
  }
}

// Delete all quizzes
export const deleteAllQuizzes = async () => {
  if (isElectron()) {
    try {
      const quizzes = await getQuizzes()
      await Promise.all(quizzes.map(q => deleteQuiz(q.id)))
      return { success: true }
    } catch (error) {
      console.error('Error deleting all quizzes:', error)
      throw error
    }
  } else {
    // Browser: use LocalStorage
    localStorage.setItem('quizzes', JSON.stringify([]))
    return { success: true }
  }
}

// Get a single quiz by ID
export const getQuizById = async (quizId) => {
  if (isElectron()) {
    try {
      const response = await fetch(`${API_BASE}/quizzes/${quizId}`)
      if (!response.ok) throw new Error('Quiz not found')
      return await response.json()
    } catch (error) {
      console.error('Error fetching quiz:', error)
      return null
    }
  } else {
    // Browser: use LocalStorage
    const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    return quizzes.find(q => q.id === quizId) || null
  }
}

// Import quizzes (replace all)
export const importQuizzes = async (quizzesToImport) => {
  if (isElectron()) {
    try {
      // Delete all existing quizzes
      await deleteAllQuizzes()

      // Import new quizzes
      await Promise.all(quizzesToImport.map(quiz => saveQuiz(quiz)))
      return { success: true, count: quizzesToImport.length }
    } catch (error) {
      console.error('Error importing quizzes:', error)
      throw error
    }
  } else {
    // Browser: use LocalStorage
    localStorage.setItem('quizzes', JSON.stringify(quizzesToImport))
    return { success: true, count: quizzesToImport.length }
  }
}
