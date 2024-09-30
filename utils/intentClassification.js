export const classifyIntent = (query) => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('ceo') || lowerQuery.includes('founder') || lowerQuery.includes('leadership')) return 'leadership_info';
    if (lowerQuery.includes('services') || lowerQuery.includes('core services') || lowerQuery.includes('working on')) return 'services_info';
    if (lowerQuery.includes('technology stack') || lowerQuery.includes('technologies')) return 'tech_stack';
    if (lowerQuery.includes('projects') || lowerQuery.includes('case studies') || lowerQuery.includes('notable projects')) return 'projects_info';
    if (lowerQuery.includes('industries') || lowerQuery.includes('fields')) return 'industries_served';
    if (lowerQuery.includes('company culture') || lowerQuery.includes('values')) return 'company_culture';
    if (lowerQuery.includes('contact') || lowerQuery.includes('contact information')) return 'contact_info';
    if (lowerQuery.includes('faq') || lowerQuery.includes('questions')) return 'faqs';
    return 'general';
};
