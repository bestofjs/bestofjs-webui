import { createContainer } from 'unstated-next'
import useSWR from 'swr'

import { fetchJSON } from '../helpers/fetch'
import api from '../api/config'

import { getProjectId } from 'components/core/project'
import { AuthContainer } from './auth-container'

export type State = {
  error?: Error
  isPending: boolean
  entities: {
    projects: Record<string, BestOfJS.Project>
    tags: Record<string, BestOfJS.Tag>
  }
  auth: {
    myProjects: BestOfJS.Bookmark[]
  }
  meta: { lastUpdate: any }
}

const initialState: State = {
  isPending: false,
  entities: { projects: {}, tags: {} },
  auth: { myProjects: [] },
  meta: { lastUpdate: undefined }
}

function useProjectList(): State {
  const state = useLoadProjects()
  const { bookmarks } = AuthContainer.useContainer()
  return { ...state, auth: { myProjects: bookmarks } }
}

export const ProjectDataContainer = createContainer(useProjectList)
export const ProjectDataProvider = ProjectDataContainer.Provider

export function useSelector(selector) {
  const state = ProjectDataContainer.useContainer()
  return selector(state)
}

async function fetchProjectsFromAPI() {
  const url = `${api('GET_PROJECTS')}/projects.json`
  return await fetchJSON(url)
}

function useLoadProjects(): Omit<State, 'auth'> {
  const { data, error } = useSWR('/api/all-projects', fetchProjectsFromAPI, {
    refreshInterval: 1000 * 60 * 30, // every 30 minute
    compare: (a, b) => {
      return a?.date === b?.date // only trigger a re-render if the timestamp has changed
    }
  })
  if (error) {
    return { ...initialState, error }
  }
  if (!data) return { ...initialState, isPending: true }
  return {
    isPending: false,
    entities: {
      projects: getProjectsBySlug(data.projects),
      tags: getTagsByCode(data.tags)
    },
    meta: {
      lastUpdate: new Date(data.date)
    }
  }
}

function getProjectsBySlug(projects) {
  const projectsBySlug = {}
  const total = projects.length

  projects.forEach((project, index) => {
    const slug = getProjectId(project)
    projectsBySlug[slug] = {
      slug,
      addedPosition: total - index,
      ...project,
      packageName: project.npm
    }
  })
  return projectsBySlug
}

function getTagsByCode(tags) {
  const tagsByCode = tags.reduce((acc, tag) => {
    return { ...acc, [tag.code]: { ...tag, id: tag.code } }
  }, {})
  return tagsByCode
}
