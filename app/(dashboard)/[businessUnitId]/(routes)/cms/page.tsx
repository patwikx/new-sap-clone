"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Globe, 
  Image, 
  Star, 
  MessageSquare, 
  MapPin, 
  Settings,
  Eye,
  Edit,
  Plus,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import axios from "axios"
import { useCurrentUser } from "@/lib/current-user"

import { AlertModal } from "@/components/modals/alert-modal"
import { CreateHeroSectionModal } from "./components/create-hero-section-modal"
import { CreateFeatureModal } from "./components/create-feature-modal"

interface HeroSection {
  id: string
  title: string
  subtitle: string
  backgroundImageUrl: string
  ctaText: string
  ctaLink: string
  isActive: boolean
  sortOrder: number
}

interface Feature {
  id: string
  title: string
  description: string
  iconName: string
  isActive: boolean
  sortOrder: number
}

interface Testimonial {
  id: string
  customerName: string
  customerTitle?: string
  content: string
  rating: number
  avatarUrl?: string
  isActive: boolean
  sortOrder: number
}

interface GalleryImage {
  id: string
  title: string
  description?: string
  imageUrl: string
  category: string
  isActive: boolean
  sortOrder: number
}

interface Amenity {
  id: string
  name: string
  description?: string
  iconName: string
  category: string
  isActive: boolean
  sortOrder: number
}

interface ContactInfo {
  id: string
  type: string
  label: string
  value: string
  iconName: string
  isActive: boolean
  sortOrder: number
}

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  isActive: boolean
  sortOrder: number
}

const CMSPage = () => {
  const params = useParams()
  const businessUnitId = params.businessUnitId as string
  const user = useCurrentUser()

  // Check authorization
  const isAuthorized = user?.role?.role === 'Admin'

  // State management
  const [heroSections, setHeroSections] = useState<HeroSection[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [contactInfo, setContactInfo] = useState<ContactInfo[]>([])
  const [faqs, setFAQs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [createHeroOpen, setCreateHeroOpen] = useState(false)
  const [createFeatureOpen, setCreateFeatureOpen] = useState(false)
  const [createTestimonialOpen, setCreateTestimonialOpen] = useState(false)
  const [createGalleryOpen, setCreateGalleryOpen] = useState(false)
  const [createAmenityOpen, setCreateAmenityOpen] = useState(false)
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const [createFAQOpen, setCreateFAQOpen] = useState(false)

  // Edit modal states
  const [editHeroOpen, setEditHeroOpen] = useState(false)
  const [editFeatureOpen, setEditFeatureOpen] = useState(false)
  const [editTestimonialOpen, setEditTestimonialOpen] = useState(false)
  const [selectedHero, setSelectedHero] = useState<HeroSection | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null)

  // Fetch all CMS data
  const fetchCMSData = async () => {
    try {
      setLoading(true)
      const [
        heroRes,
        featuresRes,
     //   testimonialsRes,
  //      galleryRes,
     //   amenitiesRes,
     //   contactRes,
     //   faqsRes
      ] = await Promise.all([
        axios.get(`/api/cms/hero-sections`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/cms/features`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),

{/*
        axios.get(`/api/${businessUnitId}/cms/testimonials`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/cms/gallery`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/cms/amenities`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/cms/contact-info`, {
          headers: { 'x-business-unit-id': businessUnitId }
        }),
        axios.get(`/api/${businessUnitId}/cms/faqs`, {
          headers: { 'x-business-unit-id': businessUnitId }
        })
*/}

      ])

      setHeroSections(heroRes.data)
      setFeatures(featuresRes.data)
    //  setTestimonials(testimonialsRes.data)
    //  setGalleryImages(galleryRes.data)
    //  setAmenities(amenitiesRes.data)
   //   setContactInfo(contactRes.data)
   //   setFAQs(faqsRes.data)
    } catch (error) {
      toast.error("Failed to fetch CMS data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessUnitId && isAuthorized) {
      fetchCMSData()
    }
  }, [businessUnitId, isAuthorized])

  const handleDelete = async () => {
    if (!deleteItem) return

    try {
      await axios.delete(`/api/${businessUnitId}/cms/${deleteItem.type}/${deleteItem.id}`, {
        headers: { 'x-business-unit-id': businessUnitId }
      })
      toast.success(`${deleteItem.name} deleted successfully`)
      setDeleteModalOpen(false)
      setDeleteItem(null)
      fetchCMSData()
    } catch (error) {
      toast.error("Failed to delete item")
      console.error(error)
    }
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )

  if (!isAuthorized) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">Access Denied</h3>
        <p className="text-muted-foreground">You need admin access to manage website content</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website Content Management</h1>
          <p className="text-muted-foreground">
            Manage your hotel website homepage content and settings
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open(`/api/public/cms/${businessUnitId}/homepage`, '_blank')}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Preview Homepage
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hero Sections</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{heroSections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{features.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testimonials</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testimonials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gallery</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{galleryImages.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amenities</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{amenities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contactInfo.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FAQs</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faqs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Management Tabs */}
      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="hero">Hero Sections</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        {/* Hero Sections Tab */}
        <TabsContent value="hero" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Hero Sections</h2>
            <Button onClick={() => setCreateHeroOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Hero Section
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {heroSections.map((hero) => (
              <Card key={hero.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{hero.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedHero(hero); setEditHeroOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'hero-sections', id: hero.id, name: hero.title }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{hero.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <img 
                      src={hero.backgroundImageUrl} 
                      alt={hero.title}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div className="flex items-center justify-between">
                      {getStatusBadge(hero.isActive)}
                      <Badge variant="outline">Order: {hero.sortOrder}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">CTA: {hero.ctaText}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Features</h2>
            <Button onClick={() => setCreateFeatureOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Feature
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedFeature(feature); setEditFeatureOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'features', id: feature.id, name: feature.title }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(feature.isActive)}
                      <Badge variant="outline">Order: {feature.sortOrder}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Icon: {feature.iconName}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Testimonials Tab */}
        <TabsContent value="testimonials" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Testimonials</h2>
            <Button onClick={() => setCreateTestimonialOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Testimonial
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{testimonial.customerName}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedTestimonial(testimonial); setEditTestimonialOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'testimonials', id: testimonial.id, name: testimonial.customerName }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{testimonial.customerTitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm line-clamp-3">{testimonial.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      {getStatusBadge(testimonial.isActive)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gallery Images</h2>
            <Button onClick={() => setCreateGalleryOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Image
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((image) => (
              <Card key={image.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <img 
                      src={image.imageUrl} 
                      alt={image.title}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{image.title}</h4>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => { 
                              setDeleteItem({ type: 'gallery', id: image.id, name: image.title }); 
                              setDeleteModalOpen(true); 
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{image.category}</Badge>
                      {getStatusBadge(image.isActive)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Amenities Tab */}
        <TabsContent value="amenities" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Amenities</h2>
            <Button onClick={() => setCreateAmenityOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Amenity
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <Card key={amenity.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{amenity.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'amenities', id: amenity.id, name: amenity.name }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{amenity.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{amenity.category}</Badge>
                      {getStatusBadge(amenity.isActive)}
                    </div>
                    <p className="text-xs text-muted-foreground">Icon: {amenity.iconName}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <Button onClick={() => setCreateContactOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contact Info
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {contactInfo.map((contact) => (
              <Card key={contact.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{contact.label}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'contact-info', id: contact.id, name: contact.label }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">{contact.value}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{contact.type}</Badge>
                      {getStatusBadge(contact.isActive)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            <Button onClick={() => setCreateFAQOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base line-clamp-2">{faq.question}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => { 
                            setDeleteItem({ type: 'faqs', id: faq.id, name: faq.question }); 
                            setDeleteModalOpen(true); 
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-3">{faq.answer}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                      {getStatusBadge(faq.isActive)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateHeroSectionModal
        isOpen={createHeroOpen}
        onClose={() => setCreateHeroOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateHeroOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <CreateFeatureModal
        isOpen={createFeatureOpen}
        onClose={() => setCreateFeatureOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateFeatureOpen(false)
        }}
        businessUnitId={businessUnitId}
      />
{/*
      <CreateTestimonialModal
        isOpen={createTestimonialOpen}
        onClose={() => setCreateTestimonialOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateTestimonialOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <CreateGalleryImageModal
        isOpen={createGalleryOpen}
        onClose={() => setCreateGalleryOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateGalleryOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <CreateAmenityModal
        isOpen={createAmenityOpen}
        onClose={() => setCreateAmenityOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateAmenityOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <CreateContactInfoModal
        isOpen={createContactOpen}
        onClose={() => setCreateContactOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateContactOpen(false)
        }}
        businessUnitId={businessUnitId}
      />

      <CreateFAQModal
        isOpen={createFAQOpen}
        onClose={() => setCreateFAQOpen(false)}
        onSuccess={() => {
          fetchCMSData()
          setCreateFAQOpen(false)
        }}
        businessUnitId={businessUnitId}
      />
      */}

      {/* Edit Modals 
      <EditHeroSectionModal
        isOpen={editHeroOpen}
        onClose={() => {
          setEditHeroOpen(false)
          setSelectedHero(null)
        }}
        onSuccess={() => {
          fetchCMSData()
          setEditHeroOpen(false)
          setSelectedHero(null)
        }}
        heroSection={selectedHero}
        businessUnitId={businessUnitId}
      />

      <EditFeatureModal
        isOpen={editFeatureOpen}
        onClose={() => {
          setEditFeatureOpen(false)
          setSelectedFeature(null)
        }}
        onSuccess={() => {
          fetchCMSData()
          setEditFeatureOpen(false)
          setSelectedFeature(null)
        }}
        feature={selectedFeature}
        businessUnitId={businessUnitId}
      />

      <EditTestimonialModal
        isOpen={editTestimonialOpen}
        onClose={() => {
          setEditTestimonialOpen(false)
          setSelectedTestimonial(null)
        }}
        onSuccess={() => {
          fetchCMSData()
          setEditTestimonialOpen(false)
          setSelectedTestimonial(null)
        }}
        testimonial={selectedTestimonial}
        businessUnitId={businessUnitId}
      />
      */}

      <AlertModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteItem(null)
        }}
        onConfirm={handleDelete}
        loading={false}
      />
    </div>
  )
}

export default CMSPage