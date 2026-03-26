import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function CourseCatalogPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
        <p className="text-muted-foreground mt-1">Browse and enroll in available courses.</p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg" role="listitem">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                {course.thumbnail_url && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.thumbnail_url}
                      alt={`Thumbnail for ${course.title}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">Enroll</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No courses are available yet. Check back soon.</p>
      )}
    </div>
    </div>
  )
}
