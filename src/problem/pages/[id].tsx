import Editor from '@monaco-editor/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { parseCookies } from 'nookies'
import { ChangeEvent, useState } from 'react'
import { FaLightbulb } from 'react-icons/fa'

import { getProblem, keyProblem, useProblem } from '../queries'

import { PageContainer } from '@src/components/layout/PageContainer'
import { Title, TitleLayout } from '@src/components/layout/Title'
import { API_HOST } from '@src/config'
import { withCookies } from '@src/context/HttpClient'
import { useMutation } from '@src/hooks/useMutation'
import { Problem } from '@src/problem/types'
import { getLatestProblemSubmission } from '@src/submission/queries'
import { submitProblem } from '@src/submission/submit/queries'
import { SubmissionWithSourceCode } from '@src/submission/types'
import { Button } from '@src/ui/Button'
import { Select } from '@src/ui/Input'
import { Link } from '@src/ui/Link'
import { ONE_SECOND } from '@src/utils/time'

const defaultValue = `#include <iostream>

using namespace std;

int main() {
    return 0;
}`

const extension: Record<string, string> = {
  cpp: '.cpp',
  c: '.c',
  python: '.py',
}

export interface WriteSolutionPageProps {
  submission: SubmissionWithSourceCode | null
}

export default function WriteSolutionPage(props: WriteSolutionPageProps) {
  const { submission } = props
  const router = useRouter()
  const id = Number(router.query.id)
  const { data: problem } = useProblem(id)
  if (!problem) {
    return null
  }
  return (
    <PageContainer maxSize="md">
      <Head>
        <title>Problem {id} | OTOG</title>
      </Head>
      <div className="flex flex-col gap-2">
        <TitleLayout>
          <Title icon={<FaLightbulb />}>{problem.name}</Title>
          <div className="flex flex-col items-end">
            <Link isExternal href={`${API_HOST}problem/doc/${problem.id}`}>
              [ดาวน์โหลด]
            </Link>
            <div className="whitespace-nowrap text-sm">
              ({problem.timeLimit / ONE_SECOND} วินาที {problem.memoryLimit} MB)
            </div>
          </div>
        </TitleLayout>
        <EditorForm problem={problem} submission={submission} />
      </div>
    </PageContainer>
  )
}

function EditorForm(props: {
  problem: Problem
  submission?: SubmissionWithSourceCode | null
}) {
  const { problem, submission } = props
  const router = useRouter()
  const [language, setLanguage] = useState<string>(
    submission?.language ?? 'cpp'
  )
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value)
  }

  const [value, setValue] = useState<string | undefined>(
    submission?.sourceCode ?? defaultValue
  )
  const onEditorChange = (value: string | undefined) => {
    setValue(value)
  }
  const submitProblemMutation = useMutation(submitProblem)
  const onSubmit = async () => {
    if (!value) return
    const blob = new Blob([value])
    const file = new File([blob], `${problem.id}${extension[language]}`)
    try {
      await submitProblemMutation(problem.id, file, language)
      router.push('/submission')
    } catch {}
  }

  return (
    <>
      <Editor
        height="75vh"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={onEditorChange}
      />

      <div className="mt-2 grid grid-cols-3">
        <Select onChange={onChange} value={language}>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="python">Python</option>
        </Select>
        <div className="flex-1" />
        <Button onClick={onSubmit}>ส่ง</Button>
      </div>
    </>
  )
}

export const getServerSideProps = withCookies<WriteSolutionPageProps>(
  async (context) => {
    const id = Number(context.query.id)
    if (Number.isNaN(id)) {
      return { notFound: true }
    }
    const { accessToken = null } = parseCookies(context)
    const problem = getProblem(id)
    const submission = accessToken ? getLatestProblemSubmission(id) : null
    return {
      props: {
        submission: await submission,
        fallback: {
          [keyProblem(id)]: await problem,
        },
      },
    }
  }
)
