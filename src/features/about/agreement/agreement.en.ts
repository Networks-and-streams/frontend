import type { AgreementDocument } from './types';

/**
 * English User Agreement.
 *
 * The Ukrainian counterpart lives in `agreement.uk.ts` and mirrors this
 * structure. Both are intentionally data-only so they can be rendered and
 * downloaded without duplicating content in components.
 */
export const agreementEn: AgreementDocument = {
	locale: 'en',
	title: 'User Agreement',
	versionLabel: 'Version 1.0',
	updatedLabel: 'Last updated: 1 October 2026',
	intro:
		'This User Agreement governs the use of the Graph Resolver web application — an educational project developed by students under academic supervision within a university programme.',
	sections: [
		{
			id: 'general',
			title: 'General provisions',
			paragraphs: [
				'This Agreement is concluded between the user and the team of developers of the Graph Resolver application (hereinafter "the Application"). It defines the terms and conditions of access to and use of the Application.',
				'By accessing or using the Application, the user confirms that they have read, understood and fully accepted this Agreement. If the user does not agree with these terms, they must stop using the Application.',
				'The Application is an educational project provided for learning, demonstration and research purposes. It is not a commercial product or service.',
			],
		},
		{
			id: 'purpose',
			title: 'Purpose of the application',
			paragraphs: [
				'The Application allows users to create and enter graphs, save and reuse them, run graph algorithms, and view the calculated solution with an interactive visualization.',
			],
			bullets: [
				'creating, editing and storing graph descriptions;',
				'running algorithms such as Minty (shortest paths) and Ford–Fulkerson (maximum flow);',
				'displaying calculated distances, paths and other results;',
				'visualizing the graph and the computed solution.',
			],
		},
		{
			id: 'responsibilities',
			title: 'User responsibilities',
			paragraphs: ['The user undertakes to:'],
			bullets: [
				'provide only lawful and non-confidential information when using the Application;',
				'keep their account credentials confidential and not transfer them to third parties;',
				'use the Application in accordance with this Agreement and applicable law;',
				'not attempt to disrupt, overload or gain unauthorised access to the Application or its infrastructure;',
				'remain solely responsible for the input data they enter and for any decisions they make based on the results.',
			],
		},
		{
			id: 'acceptable-use',
			title: 'Acceptable use',
			paragraphs: [
				'The Application may be used only for lawful educational, research and personal purposes. The following is prohibited:',
			],
			bullets: [
				'uploading malicious code, unlawful content or data the user has no right to use;',
				'automated scraping, reverse engineering or attempts to bypass security controls;',
				'using the Application to provide commercial services without prior written permission;',
				'any action that infringes the rights of the developers, the university or third parties.',
			],
		},
		{
			id: 'intellectual-property',
			title: 'Intellectual property',
			paragraphs: [
				'The Application, including its source code, interface, design, documentation and implementation of algorithms, is the intellectual property of the development team and/or the university, and is protected by applicable law.',
				'The user is granted a limited, non-exclusive, non-transferable right to use the Application for its intended educational purpose. This does not transfer any ownership rights.',
				'Responsibility for graph data entered by the user remains with the user; the user grants the Application permission to process it solely to provide the functionality described in this Agreement.',
			],
		},
		{
			id: 'availability',
			title: 'Application availability and limitations',
			paragraphs: [
				'The Application is provided on an "as is" and "as available" basis. It may be changed, suspended or discontinued at any time, in particular due to its educational nature, maintenance or infrastructure constraints.',
				'The developers do not guarantee uninterrupted or error-free operation, the preservation of saved data, or compatibility with every device or browser.',
				'The Application may impose limits on graph size, the number of saved graphs or the frequency of requests in order to protect its infrastructure.',
			],
		},
		{
			id: 'accuracy',
			title: 'Accuracy of calculations and results',
			paragraphs: [
				'Graph algorithms and their results are provided for educational and informational purposes. Although the developers aim for correctness, no warranty is given that the calculated paths, distances, flows or other results are accurate, complete or suitable for a particular purpose.',
				'The user must independently verify any result before relying on it, especially in critical or production contexts. The result depends directly on the correctness of the data entered by the user.',
			],
		},
		{
			id: 'liability',
			title: 'Limitation of liability',
			paragraphs: [
				'To the maximum extent permitted by law, the developers and the university shall not be liable for any direct, indirect or consequential loss, including loss of data, profits or academic outcomes, arising from the use of, or inability to use, the Application.',
				'The user assumes all risks associated with the use of the Application and its results. The developers are not responsible for the actions or content of users.',
				'Nothing in this Agreement excludes liability that cannot be excluded under applicable law.',
			],
		},
		{
			id: 'changes',
			title: 'Changes to the agreement',
			paragraphs: [
				'The developers may update this Agreement from time to time. The current version is always published on this page together with its version and date.',
				'Continued use of the Application after changes take effect constitutes acceptance of the updated Agreement. Users are encouraged to review this page periodically.',
			],
		},
		{
			id: 'contact',
			title: 'Contact and general provisions',
			paragraphs: [
				'Questions, suggestions and reports about the Application may be directed to the development team through the contact channels provided by the university or the project repository.',
				'If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions remain in full force. The laws of the country of the university apply to this Agreement.',
				'This document is an agreement for an educational project and does not constitute legal advice.',
			],
		},
	],
	footer: 'Thank you for using Graph Resolver responsibly.',
};
